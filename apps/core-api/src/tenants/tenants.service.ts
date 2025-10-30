import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { User } from '../users/entities/user.entity';
import { UserTenantRole } from '../users/entities/user-tenant-role.entity';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { VALID_SERVICES } from '@shared-types';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserTenantRole)
    private readonly userTenantRolesRepository: Repository<UserTenantRole>,
    private readonly auditService: AuditService,
  ) {}

  async getTenant(id: string, userTenantId: string): Promise<Tenant> {
    // Validate user belongs to this tenant
    if (id !== userTenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateTenant(
    id: string,
    userTenantId: string,
    updateDto: UpdateTenantDto,
  ): Promise<Tenant> {
    // Validate ownership
    if (id !== userTenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    const tenant = await this.getTenant(id, userTenantId);

    // Update only allowed fields
    if (updateDto.name) tenant.name = updateDto.name;
    if (updateDto.subdomain) tenant.subdomain = updateDto.subdomain;

    return this.tenantsRepository.save(tenant);
  }

  async searchTenants(query: string): Promise<Tenant[]> {
    return this.tenantsRepository
      .createQueryBuilder('tenant')
      .where('LOWER(tenant.name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .andWhere('tenant.status = :status', { status: 'active' })
      .select(['tenant.id', 'tenant.name'])
      .limit(20)
      .getMany();
  }

  async updateServices(
    tenantId: string,
    userTenantId: string,
    services: string[],
  ): Promise<Tenant> {
    // Validate user belongs to this tenant
    if (tenantId !== userTenantId) {
      throw new ForbiddenException('You can only modify your own tenant');
    }

    // Validate service names
    const validServicesList = VALID_SERVICES as readonly string[];
    const invalidServices = services.filter(
      (s: string) => !validServicesList.includes(s),
    );

    if (invalidServices.length > 0) {
      throw new BadRequestException({
        message: `Invalid service name(s): ${invalidServices.join(', ')}`,
        validServices: validServicesList as string[],
      });
    }

    // Get tenant
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Update enabled_services
    tenant.enabled_services = services;
    return this.tenantsRepository.save(tenant);
  }

  async getUsersInTenant(
    tenantId: string,
    userTenantId: string,
    userId: string,
    queryDto: GetUsersQueryDto,
  ) {
    // Verify tenant exists
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Verify user has access to this tenant (either admin or member)
    const userRole = await this.userTenantRolesRepository.findOne({
      where: { user_id: userId, tenant_id: tenantId },
    });

    if (!userRole) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    // Build query
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .innerJoin(
        'user_tenant_roles',
        'utr',
        'user.id = utr.user_id AND utr.tenant_id = :tenantId',
        { tenantId },
      )
      .select([
        'user.id',
        'user.email',
        'user.first_name',
        'user.last_name',
        'user.status',
        'user.created_at',
        'utr.role',
      ])
      .where('user.tenant_id = :tenantId', { tenantId });

    // Apply filters
    if (queryDto.role) {
      queryBuilder.andWhere('utr.role = :role', { role: queryDto.role });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('user.status = :status', {
        status: queryDto.status,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const skip = (page - 1) * limit;

    // Get results with pagination
    const users = await queryBuilder
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawMany();

    // Map results to DTO format
    const formattedUsers = users.map((user) => ({
      id: user.user_id,
      email: user.user_email,
      firstName: user.user_first_name,
      lastName: user.user_last_name,
      role: user.utr_role,
      status: user.user_status,
      createdAt: user.user_created_at,
    }));

    return {
      users: formattedUsers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async removeUserFromTenant(
    tenantId: string,
    userIdToRemove: string,
    adminUserId: string,
    adminTenantId: string,
  ) {
    // Verify tenant exists and admin has access
    if (tenantId !== adminTenantId) {
      throw new ForbiddenException('You can only modify your own tenant');
    }

    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Prevent admin from removing themselves
    if (userIdToRemove === adminUserId) {
      throw new ConflictException(
        'You cannot remove yourself from the organization',
      );
    }

    // Find the user
    const user = await this.usersRepository.findOne({
      where: { id: userIdToRemove },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify user is in the same tenant
    if (user.tenant_id !== tenantId) {
      throw new ForbiddenException('User not in your organization');
    }

    // Find the user role to remove
    const userRole = await this.userTenantRolesRepository.findOne({
      where: { user_id: userIdToRemove, tenant_id: tenantId },
    });

    if (!userRole) {
      throw new NotFoundException('User role not found in this tenant');
    }

    // OPS-001: Prevent removal of last admin in tenant
    if (userRole.role === 'admin') {
      const adminCount = await this.userTenantRolesRepository.count({
        where: { tenant_id: tenantId, role: 'admin' },
      });

      if (adminCount <= 1) {
        throw new ConflictException(
          'Cannot remove the last admin from the organization. Promote another user to admin first.',
        );
      }
    }

    // Delete user_tenant_roles entry (hard delete from tenant)
    await this.userTenantRolesRepository.remove(userRole);

    // SEC-001: Log the user removal in audit trail
    await this.auditService.log({
      tenantId,
      userId: adminUserId,
      action: 'USER_REMOVED',
      entityType: 'user',
      entityId: userIdToRemove,
      metadata: {
        removedUserEmail: user.email,
        removedUserName: `${user.first_name} ${user.last_name}`,
        removedUserRole: userRole.role,
      },
    });

    return {
      message: 'User removed from organization',
      userId: userIdToRemove,
    };
  }
}
