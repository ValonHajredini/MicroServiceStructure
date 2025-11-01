import { Test, TestingModule } from '@nestjs/testing';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

describe('FoldersController', () => {
  let controller: FoldersController;
  let service: FoldersService;

  const mockUser: JwtPayload = {
    sub: 'user-001',
    email: 'test@example.com',
    tenantId: 'tenant-001',
    roles: ['user'],
    enabledServices: ['notes'],
  };

  const mockFolder = {
    id: 'folder-001',
    tenant_id: 'tenant-001',
    user_id: 'user-001',
    name: 'Work',
    parent_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockFolderTree = [
    {
      ...mockFolder,
      children: [
        {
          id: 'folder-002',
          tenant_id: 'tenant-001',
          user_id: 'user-001',
          name: 'Projects',
          parent_id: 'folder-001',
          children: [],
        },
      ],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoldersController],
      providers: [
        {
          provide: FoldersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FoldersController>(FoldersController);
    service = module.get<FoldersService>(FoldersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a folder', async () => {
      const createDto: CreateFolderDto = { name: 'Work' };

      jest.spyOn(service, 'create').mockResolvedValue(mockFolder as any);

      const result = await controller.create(createDto, mockUser);

      expect(result.id).toBe(mockFolder.id);
      expect(result.name).toBe(mockFolder.name);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
    });

    it('should create a folder with parent', async () => {
      const createDto: CreateFolderDto = {
        name: 'Projects',
        parent_id: 'folder-001',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockFolder as any);

      await controller.create(createDto, mockUser);

      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return folder tree structure', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockFolderTree as any);

      const result = await controller.findAll(mockUser);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('folder-001');
      expect(result[0].children.length).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith(mockUser);
    });

    it('should return empty array if no folders', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll(mockUser);

      expect(result.length).toBe(0);
    });
  });

  describe('update', () => {
    it('should update folder name', async () => {
      const updateDto: UpdateFolderDto = { name: 'Updated Work' };
      const updatedFolder = { ...mockFolder, name: 'Updated Work' };

      jest.spyOn(service, 'update').mockResolvedValue(updatedFolder as any);

      const result = await controller.update('folder-001', updateDto, mockUser);

      expect(result.name).toBe('Updated Work');
      expect(service.update).toHaveBeenCalledWith('folder-001', updateDto, mockUser);
    });

    it('should update folder parent', async () => {
      const updateDto: UpdateFolderDto = { parent_id: 'folder-003' };

      jest.spyOn(service, 'update').mockResolvedValue(mockFolder as any);

      await controller.update('folder-001', updateDto, mockUser);

      expect(service.update).toHaveBeenCalledWith('folder-001', updateDto, mockUser);
    });

    it('should move folder to root', async () => {
      const updateDto: UpdateFolderDto = { parent_id: null };

      jest.spyOn(service, 'update').mockResolvedValue(mockFolder as any);

      await controller.update('folder-001', updateDto, mockUser);

      expect(service.update).toHaveBeenCalledWith('folder-001', updateDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should delete folder', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue(undefined);

      const result = await controller.remove('folder-001', mockUser);

      expect(result).toEqual({ message: 'Folder deleted successfully' });
      expect(service.delete).toHaveBeenCalledWith('folder-001', mockUser);
    });
  });
});
