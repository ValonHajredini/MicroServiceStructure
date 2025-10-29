import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
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
}
