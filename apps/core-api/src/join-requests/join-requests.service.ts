import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JoinRequest } from './entities/join-request.entity';
import { UserTenantRole } from '../users/entities/user-tenant-role.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { UpdateJoinRequestDto } from './dto/update-join-request.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class JoinRequestsService {
  constructor(
    @InjectRepository(JoinRequest)
    private readonly joinRequestsRepo: Repository<JoinRequest>,
    @InjectRepository(UserTenantRole)
    private readonly userTenantRolesRepo: Repository<UserTenantRole>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    private readonly emailService: EmailService,
  ) {}

  async createJoinRequest(
    tenantId: string,
    userId: string,
    dto: CreateJoinRequestDto,
  ): Promise<JoinRequest> {
    // Validate tenant exists and is active
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.status !== 'active') {
      throw new BadRequestException('Tenant not found or inactive');
    }

    // Check if user is already a member
    const existingRole = await this.userTenantRolesRepo.findOne({
      where: { user_id: userId, tenant_id: tenantId },
    });
    if (existingRole) {
      throw new ConflictException('Already a member of this tenant');
    }

    // Check for pending request
    const pendingRequest = await this.joinRequestsRepo.findOne({
      where: { user_id: userId, tenant_id: tenantId, status: 'pending' },
    });
    if (pendingRequest) {
      throw new ConflictException('Pending request already exists');
    }

    // Create join request
    const joinRequest = this.joinRequestsRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      message: dto.message,
      status: 'pending',
    });

    return this.joinRequestsRepo.save(joinRequest);
  }

  async getJoinRequestsForTenant(
    tenantId: string,
    adminTenantId: string,
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ data: JoinRequest[]; total: number }> {
    // Verify admin belongs to the requested tenant
    if (tenantId !== adminTenantId) {
      throw new ForbiddenException(
        'You do not have permission to view join requests for this tenant',
      );
    }

    const queryBuilder = this.joinRequestsRepo
      .createQueryBuilder('joinRequest')
      .leftJoinAndSelect('joinRequest.user', 'user')
      .where('joinRequest.tenant_id = :tenantId', { tenantId })
      .orderBy('joinRequest.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('joinRequest.status = :status', { status });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async updateJoinRequest(
    requestId: string,
    adminTenantId: string,
    dto: UpdateJoinRequestDto,
  ): Promise<JoinRequest> {
    // Find join request with relations
    const joinRequest = await this.joinRequestsRepo.findOne({
      where: { id: requestId },
      relations: ['user', 'tenant'],
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    // Verify admin belongs to the same tenant
    if (joinRequest.tenant_id !== adminTenantId) {
      throw new ForbiddenException(
        'You do not have permission to manage this join request',
      );
    }

    // Check if already processed
    if (joinRequest.status !== 'pending') {
      throw new ConflictException('Join request already processed');
    }

    // Update status
    if (dto.action === 'approve') {
      // Create user_tenant_roles entry
      await this.userTenantRolesRepo.save({
        user_id: joinRequest.user_id,
        tenant_id: joinRequest.tenant_id,
        role: 'user',
      });

      joinRequest.status = 'approved';

      // Send approval email
      await this.emailService.sendJoinRequestApprovedEmail(
        joinRequest.user.email,
        joinRequest.tenant.name,
        dto.adminResponse,
      );
    } else {
      joinRequest.status = 'rejected';

      // Send rejection email
      await this.emailService.sendJoinRequestRejectedEmail(
        joinRequest.user.email,
        joinRequest.tenant.name,
        dto.adminResponse,
      );
    }

    if (dto.adminResponse) {
      joinRequest.admin_response = dto.adminResponse;
    }

    return this.joinRequestsRepo.save(joinRequest);
  }
}
