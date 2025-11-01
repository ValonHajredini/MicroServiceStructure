import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { Note } from './entities/note.entity';
import { Attachment } from './entities/attachment.entity';
import { Folder } from '../folders/entities/folder.entity';
import { FilesClientService } from '../files/files-client.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('NotesService', () => {
  let service: NotesService;
  let notesRepo: Repository<Note>;
  let attachmentsRepo: Repository<Attachment>;
  let foldersRepo: Repository<Folder>;

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

  const mockNote: Partial<Note> = {
    id: 'note-001',
    tenant_id: 'tenant-001',
    user_id: 'user-001',
    title: 'Test Note',
    content: 'Test content',
    is_pinned: false,
  };

  beforeEach(async () => {
    const mockFilesClientService = {
      getFileMetadata: jest.fn(),
      validateFileOwnership: jest.fn(),
      getMultipleFileMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Attachment),
          useValue: {
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Folder),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: FilesClientService,
          useValue: mockFilesClientService,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    notesRepo = module.get<Repository<Note>>(getRepositoryToken(Note));
    attachmentsRepo = module.get<Repository<Attachment>>(
      getRepositoryToken(Attachment),
    );
    foldersRepo = module.get<Repository<Folder>>(getRepositoryToken(Folder));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create note with valid data', async () => {
      const createDto = { title: 'New Note', content: 'Content' };
      jest.spyOn(notesRepo, 'create').mockReturnValue(mockNote as Note);
      jest.spyOn(notesRepo, 'save').mockResolvedValue(mockNote as Note);

      const result = await service.create(createDto, mockUser);

      expect(result.id).toBe(mockNote.id);
      expect(notesRepo.create).toHaveBeenCalledWith({
        ...createDto,
        tenant_id: mockUser.tenantId,
        user_id: mockUser.sub,
      });
    });

    it('should auto-assign tenant_id and user_id from JWT', async () => {
      const createDto = { title: 'New Note' };
      jest.spyOn(notesRepo, 'create').mockReturnValue(mockNote as Note);
      jest.spyOn(notesRepo, 'save').mockResolvedValue(mockNote as Note);

      await service.create(createDto, mockUser);

      const createCall = (notesRepo.create as jest.Mock).mock.calls[0][0];
      expect(createCall.tenant_id).toBe('tenant-001');
      expect(createCall.user_id).toBe('user-001');
    });

    it('should validate folder belongs to tenant', async () => {
      const createDto = { title: 'New Note', folder_id: 'folder-001' };
      jest.spyOn(foldersRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.create(createDto, mockUser);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('findAll', () => {
    it('should return paginated notes filtered by tenant', async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockNote as Note], 1]),
      };

      jest
        .spyOn(notesRepo, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.data.length).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'note.tenant_id = :tenantId',
        { tenantId: mockUser.tenantId },
      );
    });
  });

  describe('findOne', () => {
    it('should return note with attachments', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);

      const result = await service.findOne('note-001', mockUser);

      expect(result.id).toBe(mockNote.id);
      expect(notesRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: 'note-001',
          tenant_id: mockUser.tenantId,
          deleted_at: IsNull(),
        },
        relations: ['attachments'],
      });
    });

    it('should return 404 for note in different tenant', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.findOne('note-001', mockUser);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('update', () => {
    it('should update allowed fields', async () => {
      const updateDto = { title: 'Updated Title', is_pinned: true };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest
        .spyOn(notesRepo, 'save')
        .mockResolvedValue({ ...mockNote, ...updateDto } as Note);

      const result = await service.update('note-001', updateDto, mockUser);

      expect(result.title).toBe('Updated Title');
      expect(result.is_pinned).toBe(true);
    });

    it('should enforce ownership for non-admin', async () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(otherUserNote as Note);

      try {
        await service.update('note-001', { title: 'Hack' }, mockUser);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should allow admin to update any note in their tenant', async () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(otherUserNote as Note);
      jest.spyOn(notesRepo, 'save').mockResolvedValue(otherUserNote as Note);

      const result = await service.update(
        'note-001',
        { title: 'Admin Update' },
        mockAdminUser,
      );

      expect(result).toBeDefined();
    });
  });

  describe('softDelete', () => {
    it('should soft delete note and attachments', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest.spyOn(notesRepo, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(attachmentsRepo, 'update').mockResolvedValue(undefined as any);

      await service.softDelete('note-001', mockUser);

      expect(notesRepo.update).toHaveBeenCalled();
      expect(attachmentsRepo.update).toHaveBeenCalled();
      const noteUpdateCall = (notesRepo.update as jest.Mock).mock.calls[0];
      expect(noteUpdateCall[0]).toBe('note-001');
      expect(noteUpdateCall[1].deleted_at).toBeInstanceOf(Date);
    });

    it('should enforce ownership for delete', async () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(otherUserNote as Note);

      try {
        await service.softDelete('note-001', mockUser);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('canModifyNote', () => {
    it('should return true for note owner', () => {
      const result = service.canModifyNote(mockNote as Note, mockUser);
      expect(result).toBe(true);
    });

    it('should return true for admin', () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      const result = service.canModifyNote(
        otherUserNote as Note,
        mockAdminUser,
      );
      expect(result).toBe(true);
    });

    it('should return false for non-owner non-admin', () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      const result = service.canModifyNote(otherUserNote as Note, mockUser);
      expect(result).toBe(false);
    });
  });
});
