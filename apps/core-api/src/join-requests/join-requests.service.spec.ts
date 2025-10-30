import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JoinRequestsService } from './join-requests.service';
import { JoinRequest } from './entities/join-request.entity';
import { UserTenantRole } from '../users/entities/user-tenant-role.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { EmailService } from '../email/email.service';

describe('JoinRequestsService', () => {
  let service: JoinRequestsService;

  const mockJoinRequestsRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserTenantRolesRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockTenantsRepo = {
    findOne: jest.fn(),
  };

  const mockEmailService = {
    sendJoinRequestApprovedEmail: jest.fn(),
    sendJoinRequestRejectedEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinRequestsService,
        {
          provide: getRepositoryToken(JoinRequest),
          useValue: mockJoinRequestsRepo,
        },
        {
          provide: getRepositoryToken(UserTenantRole),
          useValue: mockUserTenantRolesRepo,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantsRepo,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<JoinRequestsService>(JoinRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJoinRequest', () => {
    it('should create join request successfully', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const dto = { message: 'I want to join' };

      const mockTenant = {
        id: tenantId,
        status: 'active',
        name: 'Test Tenant',
      };
      const mockJoinRequest = {
        id: 'request-123',
        tenant_id: tenantId,
        user_id: userId,
        message: dto.message,
        status: 'pending',
      };

      mockTenantsRepo.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepo.findOne.mockResolvedValue(null);
      mockJoinRequestsRepo.findOne.mockResolvedValue(null);
      mockJoinRequestsRepo.create.mockReturnValue(mockJoinRequest);
      mockJoinRequestsRepo.save.mockResolvedValue(mockJoinRequest);

      const result = await service.createJoinRequest(tenantId, userId, dto);

      expect(result).toEqual(mockJoinRequest);
      expect(mockTenantsRepo.findOne).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
      expect(mockJoinRequestsRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if tenant not found', async () => {
      mockTenantsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createJoinRequest('tenant-123', 'user-123', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already a member', async () => {
      const mockTenant = { id: 'tenant-123', status: 'active' };
      const mockRole = { id: 'role-123', user_id: 'user-123' };

      mockTenantsRepo.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepo.findOne.mockResolvedValue(mockRole);

      await expect(
        service.createJoinRequest('tenant-123', 'user-123', {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending request exists', async () => {
      const mockTenant = { id: 'tenant-123', status: 'active' };
      const mockPendingRequest = {
        id: 'request-123',
        status: 'pending',
      };

      mockTenantsRepo.findOne.mockResolvedValue(mockTenant);
      mockUserTenantRolesRepo.findOne.mockResolvedValue(null);
      mockJoinRequestsRepo.findOne.mockResolvedValue(mockPendingRequest);

      await expect(
        service.createJoinRequest('tenant-123', 'user-123', {}),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getJoinRequestsForTenant', () => {
    it('should return join requests when admin belongs to tenant', async () => {
      const tenantId = 'tenant-123';
      const adminTenantId = 'tenant-123';
      const mockData = [
        {
          id: 'request-1',
          tenant_id: tenantId,
          user_id: 'user-1',
          status: 'pending',
          user: { id: 'user-1', email: 'user1@test.com' },
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockData, 1]),
      };

      mockJoinRequestsRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getJoinRequestsForTenant(
        tenantId,
        adminTenantId,
      );

      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'joinRequest.tenant_id = :tenantId',
        { tenantId },
      );
    });

    it('should throw ForbiddenException when admin from different tenant', async () => {
      const tenantId = 'tenant-123';
      const adminTenantId = 'tenant-456';

      await expect(
        service.getJoinRequestsForTenant(tenantId, adminTenantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateJoinRequest', () => {
    it('should approve join request and create role', async () => {
      const mockJoinRequest = {
        id: 'request-123',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        status: 'pending',
        user: { id: 'user-123', email: 'test@test.com' },
        tenant: { id: 'tenant-123', name: 'Test Tenant' },
      };

      mockJoinRequestsRepo.findOne.mockResolvedValue(mockJoinRequest);
      mockUserTenantRolesRepo.save.mockResolvedValue({});
      mockEmailService.sendJoinRequestApprovedEmail.mockResolvedValue(true);
      mockJoinRequestsRepo.save.mockResolvedValue({
        ...mockJoinRequest,
        status: 'approved',
      });

      const result = await service.updateJoinRequest(
        'request-123',
        'tenant-123',
        { action: 'approve' },
      );

      expect(result.status).toBe('approved');
      expect(mockUserTenantRolesRepo.save).toHaveBeenCalledWith({
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        role: 'user',
      });
      expect(
        mockEmailService.sendJoinRequestApprovedEmail,
      ).toHaveBeenCalledWith('test@test.com', 'Test Tenant', undefined);
    });

    it('should reject join request', async () => {
      const mockJoinRequest = {
        id: 'request-123',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        status: 'pending',
        user: { id: 'user-123', email: 'test@test.com' },
        tenant: { id: 'tenant-123', name: 'Test Tenant' },
      };

      mockJoinRequestsRepo.findOne.mockResolvedValue(mockJoinRequest);
      mockEmailService.sendJoinRequestRejectedEmail.mockResolvedValue(true);
      mockJoinRequestsRepo.save.mockResolvedValue({
        ...mockJoinRequest,
        status: 'rejected',
        admin_response: 'Sorry',
      });

      const result = await service.updateJoinRequest(
        'request-123',
        'tenant-123',
        { action: 'reject', adminResponse: 'Sorry' },
      );

      expect(result.status).toBe('rejected');
      expect(result.admin_response).toBe('Sorry');
      expect(
        mockEmailService.sendJoinRequestRejectedEmail,
      ).toHaveBeenCalledWith('test@test.com', 'Test Tenant', 'Sorry');
    });

    it('should throw ForbiddenException when admin from different tenant', async () => {
      const mockJoinRequest = {
        id: 'request-123',
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        status: 'pending',
        user: { id: 'user-123', email: 'test@test.com' },
      };

      mockJoinRequestsRepo.findOne.mockResolvedValue(mockJoinRequest);

      await expect(
        service.updateJoinRequest('request-123', 'tenant-456', {
          action: 'approve',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
