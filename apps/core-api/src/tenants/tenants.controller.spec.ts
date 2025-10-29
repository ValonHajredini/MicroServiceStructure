import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

describe('TenantsController', () => {
  let controller: TenantsController;

  const mockTenantsService = {
    getTenant: jest.fn(),
    updateTenant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: mockTenantsService,
        },
      ],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTenant', () => {
    const mockTenant = {
      id: 'tenant-id',
      name: 'Acme Corporation',
      subdomain: null,
      enabled_services: [],
      status: 'active',
      created_at: new Date('2025-10-29T10:00:00Z'),
      updated_at: new Date('2025-10-29T10:00:00Z'),
    };

    const mockUser = {
      userId: 'user-id',
      email: 'admin@acme.com',
      tenantId: 'tenant-id',
      roles: ['admin'],
      enabledServices: [],
    };

    it('should return tenant details for admin user', async () => {
      mockTenantsService.getTenant.mockResolvedValue(mockTenant);

      const result = await controller.getTenant('tenant-id', mockUser);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('tenant-id');
      expect(result.data.name).toBe('Acme Corporation');
      expect(result.meta.timestamp).toBeDefined();
      expect(mockTenantsService.getTenant).toHaveBeenCalledWith(
        'tenant-id',
        'tenant-id',
      );
    });

    it('should throw ForbiddenException for different tenant', async () => {
      mockTenantsService.getTenant.mockRejectedValue(
        new ForbiddenException('Access denied to this tenant'),
      );

      const differentUser = { ...mockUser, tenantId: 'different-tenant-id' };

      await expect(
        controller.getTenant('tenant-id', differentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTenant', () => {
    const mockTenant = {
      id: 'tenant-id',
      name: 'Acme Industries',
      subdomain: 'acme',
      enabled_services: [],
      status: 'active',
      created_at: new Date('2025-10-29T10:00:00Z'),
      updated_at: new Date('2025-10-29T12:00:00Z'),
    };

    const mockUser = {
      userId: 'user-id',
      email: 'admin@acme.com',
      tenantId: 'tenant-id',
      roles: ['admin'],
      enabledServices: [],
    };

    it('should update tenant name for admin user', async () => {
      const updateDto: UpdateTenantDto = {
        name: 'Acme Industries',
      };

      mockTenantsService.updateTenant.mockResolvedValue(mockTenant);

      const result = await controller.updateTenant(
        'tenant-id',
        updateDto,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Acme Industries');
      expect(result.meta.timestamp).toBeDefined();
      expect(mockTenantsService.updateTenant).toHaveBeenCalledWith(
        'tenant-id',
        'tenant-id',
        updateDto,
      );
    });

    it('should update tenant subdomain for admin user', async () => {
      const updateDto: UpdateTenantDto = {
        subdomain: 'acme',
      };

      mockTenantsService.updateTenant.mockResolvedValue(mockTenant);

      const result = await controller.updateTenant(
        'tenant-id',
        updateDto,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data.subdomain).toBe('acme');
      expect(mockTenantsService.updateTenant).toHaveBeenCalledWith(
        'tenant-id',
        'tenant-id',
        updateDto,
      );
    });

    it('should throw ForbiddenException for different tenant', async () => {
      const updateDto: UpdateTenantDto = {
        name: 'New Name',
      };

      mockTenantsService.updateTenant.mockRejectedValue(
        new ForbiddenException('Access denied to this tenant'),
      );

      const differentUser = { ...mockUser, tenantId: 'different-tenant-id' };

      await expect(
        controller.updateTenant('tenant-id', updateDto, differentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
