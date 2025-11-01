import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { FilesClientService } from './files-client.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

/**
 * FilesClientService Unit Tests
 * QA Fix: TEST-001 - Add missing tests for FilesClientService
 */
describe('FilesClientService', () => {
  let service: FilesClientService;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesClientService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3000'),
          },
        },
      ],
    }).compile();

    service = module.get<FilesClientService>(FilesClientService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFileMetadata', () => {
    const mockFileId = '123e4567-e89b-12d3-a456-426614174000';
    const mockToken = 'mock-jwt-token';
    const mockFileMetadata = {
      id: mockFileId,
      filename: 'test.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      storage_url: 'https://storage.example.com/files/test.pdf',
    };

    it('should successfully fetch file metadata', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: mockFileMetadata },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.getFileMetadata(mockFileId, mockToken);

      expect(result).toEqual(mockFileMetadata);
      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/files/${mockFileId}`,
        {
          headers: { Authorization: `Bearer ${mockToken}` },
          timeout: 5000,
        },
      );
    });

    it('should throw NotFoundException when file not found (404)', async () => {
      const mockError = {
        response: { status: 404 },
        message: 'File not found',
      };

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockError));

      try {
        await service.getFileMetadata(mockFileId, mockToken);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain(`File ${mockFileId} not found`);
      }
    });

    it('should throw ServiceUnavailableException when Core Service is down', async () => {
      const mockError = {
        message: 'Network Error',
      };

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockError));

      try {
        await service.getFileMetadata(mockFileId, mockToken);
        fail('Should have thrown ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('Core Service unavailable');
      }
    });

    it('should throw ServiceUnavailableException on 500 error', async () => {
      const mockError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => mockError));

      try {
        await service.getFileMetadata(mockFileId, mockToken);
        fail('Should have thrown ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
      }
    });

    it('should use custom CORE_SERVICE_URL from config', async () => {
      const customUrl = 'http://custom-core-service:3000';
      jest.spyOn(configService, 'get').mockReturnValue(customUrl);

      // Recreate service to pick up new config
      const newService = new FilesClientService(httpService, configService);

      const mockResponse: AxiosResponse = {
        data: { data: mockFileMetadata },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      await newService.getFileMetadata(mockFileId, mockToken);

      const calls = (httpService.get as jest.Mock).mock.calls;
      expect(calls[calls.length - 1][0]).toBe(`${customUrl}/api/v1/files/${mockFileId}`);
    });
  });
});
