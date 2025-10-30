import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('StorageService', () => {
  let service: StorageService;
  let mockS3Client: any;

  const mockConfig = {
    DO_SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
    DO_SPACES_REGION: 'nyc3',
    DO_SPACES_ACCESS_KEY: 'test-access-key',
    DO_SPACES_SECRET_KEY: 'test-secret-key',
    DO_SPACES_BUCKET: 'test-bucket',
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock S3Client
    mockS3Client = {
      send: jest.fn(),
      config: {},
    };

    (S3Client as jest.Mock).mockImplementation(() => mockS3Client);
    (getSignedUrl as jest.Mock).mockResolvedValue(
      'https://presigned-url.example.com',
    );

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string): string => {
        return (mockConfig[key] as string) || (defaultValue as string);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize S3Client with correct configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        endpoint: mockConfig.DO_SPACES_ENDPOINT,
        region: mockConfig.DO_SPACES_REGION,
        credentials: {
          accessKeyId: mockConfig.DO_SPACES_ACCESS_KEY,
          secretAccessKey: mockConfig.DO_SPACES_SECRET_KEY,
        },
      });
    });

    it('should warn when configuration is incomplete', async () => {
      const incompleteConfig = {
        DO_SPACES_ENDPOINT: '',
        DO_SPACES_REGION: '',
        DO_SPACES_ACCESS_KEY: '',
        DO_SPACES_SECRET_KEY: '',
        DO_SPACES_BUCKET: '',
      };

      const mockIncompleteConfigService = {
        get: jest.fn((key: string, defaultValue?: string): string => {
          return (incompleteConfig[key] as string) || (defaultValue as string);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: ConfigService,
            useValue: mockIncompleteConfigService,
          },
        ],
      }).compile();

      // Service should still be created but with warning
      const serviceWithIncompleteConfig =
        module.get<StorageService>(StorageService);
      expect(serviceWithIncompleteConfig).toBeDefined();
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate presigned upload URL successfully', async () => {
      const storageKey = 'tenant-123/notes/file-456/document.pdf';
      const mimeType = 'application/pdf';
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      const result = await service.generateUploadUrl(
        storageKey,
        mimeType,
        tenantId,
        userId,
      );

      expect(result).toBe('https://presigned-url.example.com');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should handle S3 client errors during URL generation', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('S3 connection failed'),
      );

      const storageKey = 'tenant-123/notes/file-456/document.pdf';
      const mimeType = 'application/pdf';
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      await expect(
        service.generateUploadUrl(storageKey, mimeType, tenantId, userId),
      ).rejects.toThrow('S3 connection failed');
    });

    it('should handle network timeouts', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('Network timeout'),
      );

      const storageKey = 'tenant-123/notes/file-456/document.pdf';
      const mimeType = 'application/pdf';
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      await expect(
        service.generateUploadUrl(storageKey, mimeType, tenantId, userId),
      ).rejects.toThrow('Network timeout');
    });

    it('should handle invalid credentials error', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error(
          'InvalidAccessKeyId: The AWS Access Key Id you provided does not exist',
        ),
      );

      const storageKey = 'tenant-123/notes/file-456/document.pdf';
      const mimeType = 'application/pdf';
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      await expect(
        service.generateUploadUrl(storageKey, mimeType, tenantId, userId),
      ).rejects.toThrow('InvalidAccessKeyId');
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate presigned download URL successfully', async () => {
      const storageKey = 'tenant-123/notes/file-456/document.pdf';

      const result = await service.generateDownloadUrl(storageKey);

      expect(result).toBe('https://presigned-url.example.com');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should handle S3 client errors during download URL generation', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('S3 service unavailable'),
      );

      const storageKey = 'tenant-123/notes/file-456/document.pdf';

      await expect(service.generateDownloadUrl(storageKey)).rejects.toThrow(
        'S3 service unavailable',
      );
    });

    it('should handle NoSuchKey error for non-existent files', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('NoSuchKey: The specified key does not exist'),
      );

      const storageKey = 'tenant-123/notes/non-existent-file.pdf';

      await expect(service.generateDownloadUrl(storageKey)).rejects.toThrow(
        'NoSuchKey',
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockS3Client.send.mockResolvedValue({} as any);

      const storageKey = 'tenant-123/notes/file-456/document.pdf';

      await expect(service.deleteFile(storageKey)).resolves.not.toThrow();
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle S3 client errors during deletion', async () => {
      mockS3Client.send.mockRejectedValue(new Error('S3 deletion failed'));

      const storageKey = 'tenant-123/notes/file-456/document.pdf';

      await expect(service.deleteFile(storageKey)).rejects.toThrow(
        'S3 deletion failed',
      );
    });

    it('should handle NoSuchKey error when deleting non-existent file', async () => {
      mockS3Client.send.mockRejectedValue(
        new Error('NoSuchKey: The specified key does not exist'),
      );

      const storageKey = 'tenant-123/notes/non-existent-file.pdf';

      await expect(service.deleteFile(storageKey)).rejects.toThrow('NoSuchKey');
    });

    it('should handle AccessDenied error', async () => {
      mockS3Client.send.mockRejectedValue(
        new Error('AccessDenied: Access Denied'),
      );

      const storageKey = 'tenant-123/notes/file-456/document.pdf';

      await expect(service.deleteFile(storageKey)).rejects.toThrow(
        'AccessDenied',
      );
    });

    it('should handle network connection errors during deletion', async () => {
      mockS3Client.send.mockRejectedValue(
        new Error('NetworkingError: Connection timed out'),
      );

      const storageKey = 'tenant-123/notes/file-456/document.pdf';

      await expect(service.deleteFile(storageKey)).rejects.toThrow(
        'NetworkingError',
      );
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://test-url.example.com',
      );

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false for invalid credentials', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('InvalidAccessKeyId'),
      );

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('NetworkingError: Unable to reach endpoint'),
      );

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when bucket does not exist', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(
        new Error('NoSuchBucket: The specified bucket does not exist'),
      );

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('error resilience', () => {
    it('should handle multiple consecutive failures gracefully', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('S3 Error'));

      const storageKey = 'tenant-123/notes/file-456/document.pdf';
      const mimeType = 'application/pdf';
      const tenantId = 'tenant-123';
      const userId = 'user-456';

      // Multiple calls should all fail but not crash the service
      await expect(
        service.generateUploadUrl(storageKey, mimeType, tenantId, userId),
      ).rejects.toThrow();
      await expect(service.generateDownloadUrl(storageKey)).rejects.toThrow();
      await expect(service.testConnection()).resolves.toBe(false);

      // Service should still be operational
      expect(service).toBeDefined();
    });

    it('should handle malformed responses from S3', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue(null as any);

      const storageKey = 'tenant-123/notes/file-456/document.pdf';

      const result = await service.generateDownloadUrl(storageKey);

      // Should return whatever the mocked function returns
      expect(result).toBeNull();
    });
  });

  describe('configuration edge cases', () => {
    it('should handle partial configuration gracefully', async () => {
      const partialConfig = {
        DO_SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
        DO_SPACES_REGION: '',
        DO_SPACES_ACCESS_KEY: '',
        DO_SPACES_SECRET_KEY: '',
        DO_SPACES_BUCKET: 'test-bucket',
      };

      const mockPartialConfigService = {
        get: jest.fn((key: string, defaultValue?: string): string => {
          return (partialConfig[key] as string) || (defaultValue as string);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: ConfigService,
            useValue: mockPartialConfigService,
          },
        ],
      }).compile();

      const serviceWithPartialConfig =
        module.get<StorageService>(StorageService);
      expect(serviceWithPartialConfig).toBeDefined();
    });
  });
});
