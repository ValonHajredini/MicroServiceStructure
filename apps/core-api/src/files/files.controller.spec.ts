import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import {
  PresignedUrlResponseDto,
  FileDownloadResponseDto,
  FileDeleteResponseDto,
  FileConfirmResponseDto,
} from './dto/file-response.dto';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: FilesService;

  const mockFilesService = {
    createPresignedUrl: jest.fn(),
    getFile: jest.fn(),
    deleteFile: jest.fn(),
    confirmUpload: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@example.com',
      tenantId: 'tenant-123',
      roles: ['user'],
      enabledServices: ['notes', 'kanban', 'forms'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    filesService = module.get<FilesService>(FilesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPresignedUrl', () => {
    it('should create presigned URL successfully', async () => {
      const dto: CreatePresignedUrlDto = {
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        targetService: 'notes',
      };

      const mockResponse: PresignedUrlResponseDto = {
        fileId: 'file-123',
        uploadUrl: 'https://spaces.example.com/presigned-url',
        expiresAt: '2025-10-30T10:15:00Z',
        storageKey: 'tenant-123/notes/file-123/test.pdf',
        metadata: {
          id: 'file-123',
          fileName: 'test.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          service: 'notes',
          status: 'pending',
          createdAt: new Date('2025-10-30T09:00:00Z'),
        },
      };

      mockFilesService.createPresignedUrl.mockResolvedValue(mockResponse);

      const result = await controller.createPresignedUrl(
        dto,
        mockRequest as any,
      );

      expect(filesService.createPresignedUrl).toHaveBeenCalledWith(
        dto,
        mockRequest.user.userId,
        mockRequest.user.tenantId,
      );
      expect(result).toEqual({
        success: true,
        data: mockResponse,
      });
    });

    it('should pass correct user and tenant information from JWT token', async () => {
      const dto: CreatePresignedUrlDto = {
        fileName: 'document.docx',
        fileSize: 500000,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        targetService: 'kanban',
      };

      const mockResponse: PresignedUrlResponseDto = {
        fileId: 'file-456',
        uploadUrl: 'https://spaces.example.com/presigned-url-2',
        expiresAt: '2025-10-30T10:15:00Z',
        storageKey: 'tenant-123/kanban/file-456/document.docx',
        metadata: {
          id: 'file-456',
          fileName: 'document.docx',
          fileSize: 500000,
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          service: 'kanban',
          status: 'pending',
          createdAt: new Date('2025-10-30T09:00:00Z'),
        },
      };

      mockFilesService.createPresignedUrl.mockResolvedValue(mockResponse);

      await controller.createPresignedUrl(dto, mockRequest as any);

      expect(filesService.createPresignedUrl).toHaveBeenCalledWith(
        dto,
        'user-123',
        'tenant-123',
      );
    });

    it('should propagate service errors', async () => {
      const dto: CreatePresignedUrlDto = {
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        targetService: 'notes',
      };

      mockFilesService.createPresignedUrl.mockRejectedValue(
        new Error('Storage service unavailable'),
      );

      await expect(
        controller.createPresignedUrl(dto, mockRequest as any),
      ).rejects.toThrow('Storage service unavailable');
    });
  });

  describe('getFile', () => {
    it('should get file successfully', async () => {
      const fileId = 'file-123';
      const mockResponse: FileDownloadResponseDto = {
        id: fileId,
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        service: 'notes',
        uploadedBy: {
          id: 'user-123',
        },
        downloadUrl: 'https://spaces.example.com/download-url',
        expiresAt: '2025-10-30T10:15:00Z',
        createdAt: new Date('2025-10-30T09:00:00Z'),
      };

      mockFilesService.getFile.mockResolvedValue(mockResponse);

      const result = await controller.getFile(fileId, mockRequest as any);

      expect(filesService.getFile).toHaveBeenCalledWith(
        fileId,
        mockRequest.user.userId,
        mockRequest.user.tenantId,
      );
      expect(result).toEqual({
        success: true,
        data: mockResponse,
      });
    });

    it('should pass correct tenant isolation parameters', async () => {
      const fileId = 'file-456';
      const mockResponse: FileDownloadResponseDto = {
        id: fileId,
        fileName: 'document.docx',
        fileSize: 500000,
        mimeType: 'application/msword',
        service: 'kanban',
        uploadedBy: {
          id: 'user-123',
        },
        downloadUrl: 'https://spaces.example.com/download-url-2',
        expiresAt: '2025-10-30T10:15:00Z',
        createdAt: new Date('2025-10-30T09:00:00Z'),
      };

      mockFilesService.getFile.mockResolvedValue(mockResponse);

      await controller.getFile(fileId, mockRequest as any);

      expect(filesService.getFile).toHaveBeenCalledWith(
        fileId,
        'user-123',
        'tenant-123',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully for owner', async () => {
      const fileId = 'file-123';
      const mockResponse: FileDeleteResponseDto = {
        id: fileId,
        status: 'deleted',
        deletedAt: new Date('2025-10-30T10:00:00Z'),
      };

      mockFilesService.deleteFile.mockResolvedValue(mockResponse);

      const result = await controller.deleteFile(fileId, mockRequest as any);

      expect(filesService.deleteFile).toHaveBeenCalledWith(
        fileId,
        mockRequest.user.userId,
        mockRequest.user.tenantId,
        false, // isAdmin
      );
      expect(result).toEqual({
        success: true,
        data: mockResponse,
      });
    });

    it('should delete file successfully for admin', async () => {
      const fileId = 'file-123';
      const adminRequest = {
        user: {
          ...mockRequest.user,
          roles: ['admin'],
        },
      };
      const mockResponse: FileDeleteResponseDto = {
        id: fileId,
        status: 'deleted',
        deletedAt: new Date('2025-10-30T10:00:00Z'),
      };

      mockFilesService.deleteFile.mockResolvedValue(mockResponse);

      const result = await controller.deleteFile(fileId, adminRequest as any);

      expect(filesService.deleteFile).toHaveBeenCalledWith(
        fileId,
        adminRequest.user.userId,
        adminRequest.user.tenantId,
        true, // isAdmin
      );
      expect(result).toEqual({
        success: true,
        data: mockResponse,
      });
    });

    it('should correctly detect admin role from roles array', async () => {
      const fileId = 'file-789';
      const userWithMultipleRoles = {
        user: {
          ...mockRequest.user,
          roles: ['user', 'admin', 'moderator'],
        },
      };

      mockFilesService.deleteFile.mockResolvedValue({
        id: fileId,
        status: 'deleted',
        deletedAt: new Date(),
      });

      await controller.deleteFile(fileId, userWithMultipleRoles as any);

      expect(filesService.deleteFile).toHaveBeenCalledWith(
        fileId,
        userWithMultipleRoles.user.userId,
        userWithMultipleRoles.user.tenantId,
        true,
      );
    });
  });

  describe('confirmUpload', () => {
    it('should confirm upload successfully', async () => {
      const fileId = 'file-123';
      const mockResponse: FileConfirmResponseDto = {
        id: fileId,
        status: 'active',
      };

      mockFilesService.confirmUpload.mockResolvedValue(mockResponse);

      const result = await controller.confirmUpload(fileId, mockRequest as any);

      expect(filesService.confirmUpload).toHaveBeenCalledWith(
        fileId,
        mockRequest.user.userId,
        mockRequest.user.tenantId,
      );
      expect(result).toEqual({
        success: true,
        data: mockResponse,
      });
    });

    it('should pass correct user context', async () => {
      const fileId = 'file-456';

      mockFilesService.confirmUpload.mockResolvedValue({
        id: fileId,
        status: 'active',
      });

      await controller.confirmUpload(fileId, mockRequest as any);

      expect(filesService.confirmUpload).toHaveBeenCalledWith(
        fileId,
        'user-123',
        'tenant-123',
      );
    });
  });

  describe('response structure', () => {
    it('should always return success: true and data wrapper', async () => {
      const dto: CreatePresignedUrlDto = {
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        targetService: 'notes',
      };

      mockFilesService.createPresignedUrl.mockResolvedValue({
        fileId: 'file-123',
        uploadUrl: 'https://example.com',
        expiresAt: '2025-10-30T10:15:00Z',
        storageKey: 'key',
        metadata: {
          id: 'file-123',
          fileName: 'test.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          service: 'notes',
          status: 'pending',
          createdAt: new Date('2025-10-30T09:00:00Z'),
        },
      });

      const result = await controller.createPresignedUrl(
        dto,
        mockRequest as any,
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
    });
  });
});
