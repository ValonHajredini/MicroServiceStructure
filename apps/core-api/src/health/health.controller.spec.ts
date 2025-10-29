import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: DataSource;

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = controller.health();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'core-api');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include service version', () => {
      const originalVersion = process.env.npm_package_version;
      process.env.npm_package_version = '1.2.3';

      const result = controller.health();

      expect(result.version).toBe('1.2.3');

      process.env.npm_package_version = originalVersion;
    });

    it('should use default version if npm_package_version is not set', () => {
      const originalVersion = process.env.npm_package_version;
      delete process.env.npm_package_version;

      const result = controller.health();

      expect(result.version).toBe('1.0.0');

      process.env.npm_package_version = originalVersion;
    });
  });

  describe('ready', () => {
    it('should return ready status when database is connected', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.ready();

      expect(result).toEqual({
        status: 'ready',
        database: 'connected',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw ServiceUnavailableException when database query fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      await expect(controller.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should return not ready status in exception response when database fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      try {
        await controller.ready();
        fail('Should have thrown ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const response = error.getResponse();
        expect(response).toEqual({
          status: 'not ready',
          database: 'disconnected',
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        });
      }
    });

    it('should timeout after 5 seconds', async () => {
      // Mock a query that takes longer than 5 seconds
      mockDataSource.query.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([{ '?column?': 1 }]), 6000);
          }),
      );

      await expect(controller.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    }, 10000); // Test timeout extended to 10 seconds
  });
});
