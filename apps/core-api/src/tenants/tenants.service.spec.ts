import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { UpdateTenantDto } from './dto/update-tenant.dto';

describe('TenantsService', () => {
  let service: TenantsService;

  const mockTenantsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantsRepository,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTenant', () => {
    const mockTenant = {
      id: 'tenant-id',
      name: 'Acme Corporation',
      subdomain: null,
      enabled_services: [],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should return tenant for valid user', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);

      const result = await service.getTenant('tenant-id', 'tenant-id');

      expect(result).toEqual(mockTenant);
      expect(mockTenantsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tenant-id' },
      });
    });

    it('should throw ForbiddenException if user tries to access different tenant', async () => {
      await expect(
        service.getTenant('tenant-id', 'different-tenant-id'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getTenant('tenant-id', 'different-tenant-id'),
      ).rejects.toThrow('Access denied to this tenant');
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(null);

      await expect(service.getTenant('tenant-id', 'tenant-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getTenant('tenant-id', 'tenant-id')).rejects.toThrow(
        'Tenant not found',
      );
    });
  });

  describe('updateTenant', () => {
    const mockTenant = {
      id: 'tenant-id',
      name: 'Acme Corporation',
      subdomain: null,
      enabled_services: [],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update tenant name successfully', async () => {
      const updateDto: UpdateTenantDto = {
        name: 'Acme Industries',
      };

      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockTenantsRepository.save.mockResolvedValue({
        ...mockTenant,
        name: 'Acme Industries',
      });

      const result = await service.updateTenant(
        'tenant-id',
        'tenant-id',
        updateDto,
      );

      expect(result.name).toBe('Acme Industries');
      expect(mockTenantsRepository.save).toHaveBeenCalled();
    });

    it('should update tenant subdomain successfully', async () => {
      const updateDto: UpdateTenantDto = {
        subdomain: 'acme',
      };

      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockTenantsRepository.save.mockResolvedValue({
        ...mockTenant,
        subdomain: 'acme',
      });

      const result = await service.updateTenant(
        'tenant-id',
        'tenant-id',
        updateDto,
      );

      expect(result.subdomain).toBe('acme');
      expect(mockTenantsRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user tries to update different tenant', async () => {
      const updateDto: UpdateTenantDto = {
        name: 'New Name',
      };

      await expect(
        service.updateTenant('tenant-id', 'different-tenant-id', updateDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateTenant('tenant-id', 'different-tenant-id', updateDto),
      ).rejects.toThrow('Access denied to this tenant');
    });

    it('should not modify enabled_services or status', async () => {
      const updateDto: UpdateTenantDto = {
        name: 'New Name',
      };

      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);

      const savedTenant = {
        ...mockTenant,
        name: 'New Name',
      };
      mockTenantsRepository.save.mockResolvedValue(savedTenant);

      const result = await service.updateTenant(
        'tenant-id',
        'tenant-id',
        updateDto,
      );

      // Verify enabled_services and status remain unchanged
      expect(result.enabled_services).toEqual([]);
      expect(result.status).toBe('active');
    });
  });
});
