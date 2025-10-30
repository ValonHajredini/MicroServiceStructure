import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';
import { FilesValidator } from './files.validator';
import { FileMetadata } from './entities/file-metadata.entity';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';

describe('FilesService', () => {
  let service: FilesService;
  let repository: Repository<FileMetadata>;
  let storageService: StorageService;
  let validator: FilesValidator;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockStorageService = {
    generateUploadUrl: jest.fn(),
    generateDownloadUrl: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockValidator = {
    validateFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(FileMetadata),
          useValue: mockRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: FilesValidator,
          useValue: mockValidator,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    repository = module.get<Repository<FileMetadata>>(
      getRepositoryToken(FileMetadata),
    );
    storageService = module.get<StorageService>(StorageService);
    validator = module.get<FilesValidator>(FilesValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPresignedUrl', () => {
    const dto: CreatePresignedUrlDto = {
      fileName: 'test.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      targetService: 'notes',
    };
    const userId = 'user-123';
    const tenantId = 'tenant-123';

    it('should create presigned URL successfully', async () => {
      const sanitizedFileName = 'test.pdf';
      const uploadUrl = 'https://spaces.example.com/presigned-url';
      const fileMetadata = {
        id: 'file-123',
        tenantId,
        uploadedByUserId: userId,
        filename: sanitizedFileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        storageKey: `${tenantId}/${dto.targetService}/file-123/${sanitizedFileName}`,
        service: dto.targetService,
        status: 'pending',
        createdAt: new Date(),
      };

      mockValidator.validateFile.mockReturnValue(sanitizedFileName);
      mockStorageService.generateUploadUrl.mockResolvedValue(uploadUrl);
      mockRepository.create.mockReturnValue(fileMetadata);
      mockRepository.save.mockResolvedValue(fileMetadata);

      const result = await service.createPresignedUrl(dto, userId, tenantId);

      expect(validator.validateFile).toHaveBeenCalledWith(
        dto.fileName,
        dto.fileSize,
        dto.mimeType,
        dto.targetService,
      );
      expect(result.uploadUrl).toBe(uploadUrl);
      expect(result.metadata.status).toBe('pending');
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getFile', () => {
    const fileId = 'file-123';
    const userId = 'user-123';
    const tenantId = 'tenant-123';

    it('should get file successfully', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId,
        uploadedByUserId: userId,
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'active' as const,
        createdAt: new Date(),
      };
      const downloadUrl = 'https://spaces.example.com/download-url';

      mockRepository.findOne.mockResolvedValue(fileMetadata);
      mockStorageService.generateDownloadUrl.mockResolvedValue(downloadUrl);

      const result = await service.getFile(fileId, userId, tenantId);

      expect(result.downloadUrl).toBe(downloadUrl);
      expect(result.fileName).toBe('test.pdf');
    });

    it('should throw NotFoundException if file does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getFile(fileId, userId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if tenant does not match', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId: 'different-tenant',
        uploadedByUserId: userId,
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'active' as const,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(fileMetadata);

      await expect(service.getFile(fileId, userId, tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if file is deleted', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId,
        uploadedByUserId: userId,
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'deleted' as const,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(fileMetadata);

      await expect(service.getFile(fileId, userId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteFile', () => {
    const fileId = 'file-123';
    const userId = 'user-123';
    const tenantId = 'tenant-123';

    it('should delete file successfully', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId,
        uploadedByUserId: userId,
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'active' as const,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(fileMetadata);
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await service.deleteFile(fileId, userId, tenantId);

      expect(result.status).toBe('deleted');
      expect(repository.update).toHaveBeenCalled();
      expect(storageService.deleteFile).toHaveBeenCalledWith('storage-key');
    });

    it('should throw ForbiddenException if user is not owner and not admin', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId,
        uploadedByUserId: 'different-user',
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'active' as const,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(fileMetadata);

      await expect(
        service.deleteFile(fileId, userId, tenantId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to delete any file', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId,
        uploadedByUserId: 'different-user',
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'active' as const,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(fileMetadata);
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await service.deleteFile(fileId, userId, tenantId, true);

      expect(result.status).toBe('deleted');
    });
  });

  describe('confirmUpload', () => {
    const fileId = 'file-123';
    const userId = 'user-123';
    const tenantId = 'tenant-123';

    it('should confirm upload successfully', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId,
        uploadedByUserId: userId,
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'pending' as const,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(fileMetadata);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.confirmUpload(fileId, userId, tenantId);

      expect(result.status).toBe('active');
      expect(repository.update).toHaveBeenCalledWith(fileId, {
        status: 'active',
      });
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const fileMetadata = {
        id: fileId,
        tenantId,
        uploadedByUserId: 'different-user',
        filename: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storageKey: 'storage-key',
        service: 'notes',
        status: 'pending' as const,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(fileMetadata);

      await expect(
        service.confirmUpload(fileId, userId, tenantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
