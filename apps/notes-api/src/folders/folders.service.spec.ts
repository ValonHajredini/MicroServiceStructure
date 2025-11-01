import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { Folder } from './entities/folder.entity';
import { Note } from '../notes/entities/note.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('FoldersService', () => {
  let service: FoldersService;
  let foldersRepo: Repository<Folder>;
  let notesRepo: Repository<Note>;

  const mockUser: JwtPayload = {
    sub: 'user-001',
    email: 'test@example.com',
    tenantId: 'tenant-001',
    roles: ['user'],
    enabledServices: ['notes'],
  };

  const mockAdminUser: JwtPayload = {
    ...mockUser,
    sub: 'admin-001',
    roles: ['admin'],
  };

  const mockFolder: Partial<Folder> = {
    id: 'folder-001',
    tenant_id: 'tenant-001',
    user_id: 'user-001',
    name: 'Work',
    parent_id: null,
  };

  const mockChildFolder: Partial<Folder> = {
    id: 'folder-002',
    tenant_id: 'tenant-001',
    user_id: 'user-001',
    name: 'Projects',
    parent_id: 'folder-001',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        {
          provide: getRepositoryToken(Folder),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Note),
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FoldersService>(FoldersService);
    foldersRepo = module.get<Repository<Folder>>(getRepositoryToken(Folder));
    notesRepo = module.get<Repository<Note>>(getRepositoryToken(Note));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create folder with valid data', async () => {
      const createDto = { name: 'Work' };

      jest.spyOn(foldersRepo, 'create').mockReturnValue(mockFolder as Folder);
      jest.spyOn(foldersRepo, 'save').mockResolvedValue(mockFolder as Folder);

      const result = await service.create(createDto, mockUser);

      expect(result.id).toBe(mockFolder.id);
      expect(result.name).toBe(mockFolder.name);
      expect(foldersRepo.create).toHaveBeenCalledWith({
        name: 'Work',
        parent_id: undefined,
        tenant_id: 'tenant-001',
        user_id: 'user-001',
      });
    });

    it('should create folder with parent (one level deep)', async () => {
      const createDto = { name: 'Projects', parent_id: 'folder-001' };
      const parentFolder = { ...mockFolder, parent_id: null };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(parentFolder as Folder);
      jest.spyOn(foldersRepo, 'create').mockReturnValue(mockChildFolder as Folder);
      jest.spyOn(foldersRepo, 'save').mockResolvedValue(mockChildFolder as Folder);

      const result = await service.create(createDto, mockUser);

      expect(result.id).toBe(mockChildFolder.id);
      expect(result.parent_id).toBe('folder-001');
      expect(foldersRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'folder-001', tenant_id: 'tenant-001' },
      });
    });

    it('should reject creation if parent has parent (multi-level nesting)', async () => {
      const createDto = { name: 'Nested', parent_id: 'folder-002' };
      const parentWithParent = { ...mockChildFolder, parent_id: 'folder-001' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(parentWithParent as Folder);

      try {
        await service.create(createDto, mockUser);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Folders can only be nested one level deep');
      }
    });

    it('should return 404 if parent does not exist', async () => {
      const createDto = { name: 'Projects', parent_id: 'non-existent' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.create(createDto, mockUser);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Parent folder not found');
      }
    });
  });

  describe('findAll', () => {
    it('should return folders as tree structure', async () => {
      const folders = [mockFolder, mockChildFolder] as Folder[];

      jest.spyOn(foldersRepo, 'find').mockResolvedValue(folders);

      const result = await service.findAll(mockUser);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('folder-001');
      expect(result[0].children.length).toBe(1);
      expect(result[0].children[0].id).toBe('folder-002');
    });

    it('should filter by tenant_id', async () => {
      jest.spyOn(foldersRepo, 'find').mockResolvedValue([]);

      await service.findAll(mockUser);

      expect(foldersRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-001' },
        order: { name: 'ASC' },
      });
    });

    it('should order folders by name ASC', async () => {
      const folders = [
        { ...mockFolder, name: 'Zebra' },
        { ...mockFolder, name: 'Apple' },
      ] as Folder[];

      jest.spyOn(foldersRepo, 'find').mockResolvedValue(folders);

      await service.findAll(mockUser);

      const findCall = (foldersRepo.find as jest.Mock).mock.calls[0][0];
      expect(findCall.order).toEqual({ name: 'ASC' });
    });
  });

  describe('update', () => {
    it('should update folder name', async () => {
      const updateDto = { name: 'Updated Work' };
      const updatedFolder = { ...mockFolder, name: 'Updated Work' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(mockFolder as Folder);
      jest.spyOn(foldersRepo, 'save').mockResolvedValue(updatedFolder as Folder);

      const result = await service.update('folder-001', updateDto, mockUser);

      expect(result.name).toBe('Updated Work');
    });

    it('should move folder to different parent (single-level)', async () => {
      const updateDto = { parent_id: 'folder-003' };
      const newParent = { ...mockFolder, id: 'folder-003', parent_id: null };

      jest.spyOn(foldersRepo, 'findOne')
        .mockResolvedValueOnce(mockFolder as Folder)  // findOne for folder being updated
        .mockResolvedValueOnce(newParent as Folder);  // findOne for parent validation
      jest.spyOn(foldersRepo, 'count').mockResolvedValue(0);
      jest.spyOn(foldersRepo, 'save').mockResolvedValue(mockFolder as Folder);

      await service.update('folder-001', updateDto, mockUser);

      expect(foldersRepo.count).toHaveBeenCalled();
    });

    it('should prevent multi-level nesting when moving', async () => {
      const updateDto = { parent_id: 'folder-002' };
      const parentWithParent = { ...mockChildFolder, parent_id: 'folder-001' };

      jest.spyOn(foldersRepo, 'findOne')
        .mockResolvedValueOnce(mockFolder as Folder)
        .mockResolvedValueOnce(parentWithParent as Folder);

      try {
        await service.update('folder-001', updateDto, mockUser);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should prevent circular reference (folder as own parent)', async () => {
      const updateDto = { parent_id: 'folder-001' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(mockFolder as Folder);

      try {
        await service.update('folder-001', updateDto, mockUser);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Folder cannot be its own parent');
      }
    });

    it('should enforce ownership (user owns folder)', async () => {
      const otherUserFolder = { ...mockFolder, user_id: 'other-user' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(otherUserFolder as Folder);

      try {
        await service.update('folder-001', { name: 'New Name' }, mockUser);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should allow admin to modify any folder', async () => {
      const otherUserFolder = { ...mockFolder, user_id: 'other-user' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(otherUserFolder as Folder);
      jest.spyOn(foldersRepo, 'save').mockResolvedValue(otherUserFolder as Folder);

      const result = await service.update('folder-001', { name: 'New Name' }, mockAdminUser);

      expect(result).toBeDefined();
    });

    it('should return 404 if folder does not exist', async () => {
      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.update('non-existent', { name: 'New' }, mockUser);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('delete', () => {
    it('should delete folder and move notes to root', async () => {
      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(mockFolder as Folder);
      jest.spyOn(foldersRepo, 'find').mockResolvedValue([]);
      jest.spyOn(notesRepo, 'update').mockResolvedValue(undefined);
      jest.spyOn(foldersRepo, 'delete').mockResolvedValue(undefined);

      await service.delete('folder-001', mockUser);

      expect(notesRepo.update).toHaveBeenCalledWith(
        { folder_id: 'folder-001', tenant_id: 'tenant-001' },
        { folder_id: null },
      );
      expect(foldersRepo.delete).toHaveBeenCalledWith('folder-001');
    });

    it('should delete child folders and move their notes to root', async () => {
      const childFolders = [mockChildFolder] as Folder[];

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(mockFolder as Folder);
      jest.spyOn(foldersRepo, 'find').mockResolvedValue(childFolders);
      jest.spyOn(notesRepo, 'update').mockResolvedValue(undefined);
      jest.spyOn(foldersRepo, 'delete').mockResolvedValue(undefined);

      await service.delete('folder-001', mockUser);

      expect(notesRepo.update).toHaveBeenCalledTimes(2);
      expect(foldersRepo.delete).toHaveBeenCalledWith('folder-002');
      expect(foldersRepo.delete).toHaveBeenCalledWith('folder-001');
    });

    it('should enforce ownership (user owns folder)', async () => {
      const otherUserFolder = { ...mockFolder, user_id: 'other-user' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(otherUserFolder as Folder);

      try {
        await service.delete('folder-001', mockUser);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should allow admin to delete any folder', async () => {
      const otherUserFolder = { ...mockFolder, user_id: 'other-user' };

      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(otherUserFolder as Folder);
      jest.spyOn(foldersRepo, 'find').mockResolvedValue([]);
      jest.spyOn(notesRepo, 'update').mockResolvedValue(undefined);
      jest.spyOn(foldersRepo, 'delete').mockResolvedValue(undefined);

      const result = await service.delete('folder-001', mockAdminUser);

      expect(result).toBeUndefined();
    });

    it('should return 404 if folder does not exist', async () => {
      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.delete('non-existent', mockUser);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('canModifyFolder', () => {
    it('should return true if user owns folder', () => {
      const result = service.canModifyFolder(mockFolder as Folder, mockUser);
      expect(result).toBe(true);
    });

    it('should return true if user is admin', () => {
      const otherUserFolder = { ...mockFolder, user_id: 'other-user' };
      const result = service.canModifyFolder(otherUserFolder as Folder, mockAdminUser);
      expect(result).toBe(true);
    });

    it('should return false if user does not own folder and is not admin', () => {
      const otherUserFolder = { ...mockFolder, user_id: 'other-user' };
      const result = service.canModifyFolder(otherUserFolder as Folder, mockUser);
      expect(result).toBe(false);
    });
  });
});
