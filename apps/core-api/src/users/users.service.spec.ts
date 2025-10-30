import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserTenantRole } from './entities/user-tenant-role.entity';
import { AuditService } from '../audit/audit.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockUserTenantRolesRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('changeUserRole', () => {
    const mockUser = {
      id: 'user-id',
      tenant_id: 'tenant-id',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      status: 'active',
    };

    const mockUserRole = {
      id: 'role-id',
      user_id: 'user-id',
      tenant_id: 'tenant-id',
      role: 'user',
      created_at: new Date(),
    };

    const mockAdminUserId = 'admin-id';
    const mockAdminTenantId = 'tenant-id';

    it('should change user role successfully', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);
      mockUserTenantRolesRepository.save.mockResolvedValue({
        ...mockUserRole,
        role: 'admin',
      });

      const result = await service.changeUserRole(
        'user-id',
        'admin',
        mockAdminUserId,
        mockAdminTenantId,
      );

      expect(result.email).toBe('john@example.com');
      expect(result.role).toBe('admin');
      expect(mockUserTenantRolesRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if admin tries to change own role', async () => {
      await expect(
        service.changeUserRole(
          mockAdminUserId,
          'user',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.changeUserRole(
          mockAdminUserId,
          'user',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow('Cannot change your own role');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changeUserRole(
          'user-id',
          'admin',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.changeUserRole(
          'user-id',
          'admin',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow('User not found');
    });

    it('should throw ForbiddenException if user is not in same tenant', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUser,
        tenant_id: 'different-tenant-id',
      });

      await expect(
        service.changeUserRole(
          'user-id',
          'admin',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.changeUserRole(
          'user-id',
          'admin',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow('User not in your organization');
    });

    it('should throw NotFoundException if user role not found in tenant', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changeUserRole(
          'user-id',
          'admin',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.changeUserRole(
          'user-id',
          'admin',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow('User role not found in this tenant');
    });

    it('should throw BadRequestException for invalid role', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);

      await expect(
        service.changeUserRole(
          'user-id',
          'invalid-role',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changeUserRole(
          'user-id',
          'invalid-role',
          mockAdminUserId,
          mockAdminTenantId,
        ),
      ).rejects.toThrow('Invalid role');
    });

    it('should allow changing role from user to admin', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue(mockUserRole);
      mockUserTenantRolesRepository.save.mockResolvedValue({
        ...mockUserRole,
        role: 'admin',
      });

      const result = await service.changeUserRole(
        'user-id',
        'admin',
        mockAdminUserId,
        mockAdminTenantId,
      );

      expect(result.role).toBe('admin');
    });

    it('should allow changing role from admin to user', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRolesRepository.findOne.mockResolvedValue({
        ...mockUserRole,
        role: 'admin',
      });
      mockUserTenantRolesRepository.save.mockResolvedValue({
        ...mockUserRole,
        role: 'user',
      });

      const result = await service.changeUserRole(
        'user-id',
        'user',
        mockAdminUserId,
        mockAdminTenantId,
      );

      expect(result.role).toBe('user');
    });
  });
});
