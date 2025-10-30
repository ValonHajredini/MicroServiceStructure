import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserTenantRole } from './entities/user-tenant-role.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserTenantRole)
    private readonly userTenantRolesRepository: Repository<UserTenantRole>,
    private readonly auditService: AuditService,
  ) {}

  async changeUserRole(
    userId: string,
    newRole: string,
    adminUserId: string,
    adminTenantId: string,
  ) {
    // Prevent admin from changing their own role
    if (userId === adminUserId) {
      throw new ConflictException('Cannot change your own role');
    }

    // Find the user
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify the user is in the same tenant as the admin
    if (user.tenant_id !== adminTenantId) {
      throw new ForbiddenException('User not in your organization');
    }

    // Find and update the user's role in user_tenant_roles
    const userRole = await this.userTenantRolesRepository.findOne({
      where: {
        user_id: userId,
        tenant_id: adminTenantId,
      },
    });

    if (!userRole) {
      throw new NotFoundException('User role not found in this tenant');
    }

    // Validate the new role
    if (!['admin', 'user', 'viewer'].includes(newRole)) {
      throw new BadRequestException('Invalid role');
    }

    // Store old role for audit log
    const oldRole = userRole.role;

    // Update the role
    userRole.role = newRole;
    await this.userTenantRolesRepository.save(userRole);

    // Log the role change in audit trail
    await this.auditService.log({
      tenantId: adminTenantId,
      userId: adminUserId,
      action: 'USER_ROLE_CHANGED',
      entityType: 'user',
      entityId: userId,
      metadata: {
        oldRole,
        newRole,
        targetUserEmail: user.email,
        targetUserName: `${user.first_name} ${user.last_name}`,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: newRole,
      updatedAt: new Date(),
    };
  }
}
