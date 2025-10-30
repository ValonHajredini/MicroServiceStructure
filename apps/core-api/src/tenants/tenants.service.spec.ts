import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { UserTenantRole } from '../users/entities/user-tenant-role.entity';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { AuditService } from '../audit/audit.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let mockQueryBuilder: any;

  const mockTenantsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsersRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserTenantRolesRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawMany: jest.fn(),
    };

    mockTenantsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockUsersRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(UserTenantRole),
          useValue: mockUserTenantRolesRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
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

  describe('searchTenants', () => {
    it('should return matching tenants', async () => {
      const mockTenants = [
        { id: '1', name: 'Acme Corp' },
        { id: '2', name: 'Acme Industries' },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockTenants);

      const result = await service.searchTenants('acme');

      expect(result).toEqual(mockTenants);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });

    it('should limit results to 20 tenants', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchTenants('test');

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });

    it('should only return active tenants', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchTenants('test');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tenant.status = :status',
        { status: 'active' },
      );
    });
  });

  describe('updateServices', () => {
    const mockTenant = {
      id: 'tenant-id',
      name: 'Acme Corporation',
      subdomain: null,
      enabled_services: [],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update services successfully with valid service names', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockTenantsRepository.save.mockResolvedValue({
        ...mockTenant,
        enabled_services: ['notes', 'kanban'],
      });

      const result = await service.updateServices('tenant-id', 'tenant-id', [
        'notes',
        'kanban',
      ]);

      expect(result.enabled_services).toEqual(['notes', 'kanban']);
      expect(mockTenantsRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid service names', async () => {
      await expect(
        service.updateServices('tenant-id', 'tenant-id', ['invalid-service']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user tries to update different tenant', async () => {
      await expect(
        service.updateServices('tenant-id', 'different-tenant-id', ['notes']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateServices('tenant-id', 'different-tenant-id', ['notes']),
      ).rejects.toThrow('You can only modify your own tenant');
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateServices('tenant-id', 'tenant-id', ['notes']),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateServices('tenant-id', 'tenant-id', ['notes']),
      ).rejects.toThrow('Tenant not found');
    });

    it('should allow empty services array', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockTenantsRepository.save.mockResolvedValue({
        ...mockTenant,
        enabled_services: [],
      });

      const result = await service.updateServices('tenant-id', 'tenant-id', []);

      expect(result.enabled_services).toEqual([]);
      expect(mockTenantsRepository.save).toHaveBeenCalled();
    });

    it('should reject mixed valid and invalid service names', async () => {
      await expect(
        service.updateServices('tenant-id', 'tenant-id', [
          'notes',
          'invalid-service',
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUsersInTenant', () => {
    const mockTenant = {
      id: 'tenant-id',
      name: 'Acme Corporation',
      subdomain: null,
      enabled_services: [],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockUserRole = {
      id: 'role-id',
      user_id: 'user-id',
      tenant_id: 'tenant-id',
      role: 'admin',
      created_at: new Date(),
    };

    const mockUsers = [
      {
        user_id: 'user-1',
        user_email: 'john@example.com',
        user_first_name: 'John',
        user_last_name: 'Doe',
        user_status: 'active',
        user_created_at: new Date(),
        utr_role: 'admin',
      },
      {
        user_id: 'user-2',
        user_email: 'jane@example.com',
        user_first_name: 'Jane',
        user_last_name: 'Smith',
        user_status: 'active',
        user_created_at: new Date(),
        utr_role: 'user',
      },
    ];

    it('should return users in tenant with pagination', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);
      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockUsers);

      const queryDto: GetUsersQueryDto = {
        page: 1,
        limit: 20,
      };

      const result = await service.getUsersInTenant(
        'tenant-id',
        'tenant-id',
        'user-id',
        queryDto,
      );

      expect(result.users).toHaveLength(2);
      expect(result.users[0].email).toBe('john@example.com');
      expect(result.users[1].role).toBe('user');
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(null);

      const queryDto: GetUsersQueryDto = { page: 1, limit: 20 };

      await expect(
        service.getUsersInTenant('tenant-id', 'tenant-id', 'user-id', queryDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have access to tenant', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(null);

      const queryDto: GetUsersQueryDto = { page: 1, limit: 20 };

      await expect(
        service.getUsersInTenant('tenant-id', 'tenant-id', 'user-id', queryDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getUsersInTenant('tenant-id', 'tenant-id', 'user-id', queryDto),
      ).rejects.toThrow('You do not have access to this tenant');
    });

    it('should filter users by role', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getRawMany.mockResolvedValue([mockUsers[0]]);

      const queryDto: GetUsersQueryDto = {
        page: 1,
        limit: 20,
        role: 'admin',
      };

      await service.getUsersInTenant(
        'tenant-id',
        'tenant-id',
        'user-id',
        queryDto,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'utr.role = :role',
        { role: 'admin' },
      );
    });

    it('should filter users by status', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getRawMany.mockResolvedValue([mockUsers[0]]);

      const queryDto: GetUsersQueryDto = {
        page: 1,
        limit: 20,
        status: 'active',
      };

      await service.getUsersInTenant(
        'tenant-id',
        'tenant-id',
        'user-id',
        queryDto,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        { status: 'active' },
      );
    });

    it('should handle pagination correctly', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);
      mockQueryBuilder.getCount.mockResolvedValue(50);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockUsers);

      const queryDto: GetUsersQueryDto = {
        page: 2,
        limit: 20,
      };

      const result = await service.getUsersInTenant(
        'tenant-id',
        'tenant-id',
        'user-id',
        queryDto,
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('removeUserFromTenant', () => {
    const mockTenant = {
      id: 'tenant-id',
      name: 'Acme Corporation',
      status: 'active',
    };

    const mockUser = {
      id: 'user-to-remove',
      tenant_id: 'tenant-id',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
    };

    const mockUserRole = {
      id: 'role-id',
      user_id: 'user-to-remove',
      tenant_id: 'tenant-id',
      role: 'user',
    };

    it('should remove user from tenant successfully', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);
      mockUserTenantRolesRepository.remove.mockResolvedValue(mockUserRole);

      const result = await service.removeUserFromTenant(
        'tenant-id',
        'user-to-remove',
        'admin-id',
        'tenant-id',
      );

      expect(result.message).toBe('User removed from organization');
      expect(result.userId).toBe('user-to-remove');
      expect(mockUserTenantRolesRepository.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if admin tries to modify different tenant', async () => {
      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'different-tenant-id',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if admin tries to remove themselves', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);

      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'admin-id',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'admin-id',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow('You cannot remove yourself from the organization');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not in same tenant', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUser,
        tenant_id: 'different-tenant-id',
      });

      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow('User not in your organization');
    });

    it('should throw NotFoundException if user role not found in tenant', async () => {
      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow('User role not found in this tenant');
    });

    it('should throw ConflictException if trying to remove the last admin', async () => {
      const mockAdminRole = {
        ...mockUserRole,
        role: 'admin',
      };

      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockAdminRole);
      mockUserTenantRolesRepository.count.mockResolvedValue(1); // Only 1 admin

      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.removeUserFromTenant(
          'tenant-id',
          'user-to-remove',
          'admin-id',
          'tenant-id',
        ),
      ).rejects.toThrow('Cannot remove the last admin from the organization');
    });

    it('should allow removing an admin if there are multiple admins', async () => {
      const mockAdminRole = {
        ...mockUserRole,
        role: 'admin',
      };

      mockTenantsRepository.findOne.mockResolvedValue(mockTenant);
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockAdminRole);
      mockUserTenantRolesRepository.count.mockResolvedValue(2); // 2 admins
      mockUserTenantRolesRepository.remove.mockResolvedValue(mockAdminRole);

      const result = await service.removeUserFromTenant(
        'tenant-id',
        'user-to-remove',
        'admin-id',
        'tenant-id',
      );

      expect(result.message).toBe('User removed from organization');
      expect(mockUserTenantRolesRepository.remove).toHaveBeenCalled();
    });
  });
});
