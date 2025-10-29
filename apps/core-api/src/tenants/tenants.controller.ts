import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':id')
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Get tenant details',
    description: 'Retrieve tenant information. Admin role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Admin role required or access denied to this tenant',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenant(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const tenant = await this.tenantsService.getTenant(id, user.tenantId);

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        enabled_services: tenant.enabled_services,
        status: tenant.status,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch(':id')
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant name or subdomain. Admin role required.',
  })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Admin role required or access denied to this tenant',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: RequestUser,
  ) {
    const tenant = await this.tenantsService.updateTenant(
      id,
      user.tenantId,
      updateTenantDto,
    );

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        enabled_services: tenant.enabled_services,
        status: tenant.status,
        updated_at: tenant.updated_at,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
