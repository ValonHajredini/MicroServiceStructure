import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateServicesDto } from './dto/update-services.dto';
import { SearchTenantsDto } from './dto/search-tenants.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { TenantResponse } from './dto/tenant-response.dto';
import { ServiceUpdateResponse } from './dto/service-update-response.dto';
import { UsersInTenantResponse } from './dto/user-in-tenant-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('search')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Search tenants by name',
    description:
      'Public endpoint to search for active tenants by name. Returns limited data (id, name only).',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Query too short (min 2 characters)',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async searchTenants(@Query() searchDto: SearchTenantsDto) {
    const results = await this.tenantsService.searchTenants(searchDto.name);

    return {
      success: true,
      data: results,
      meta: {
        count: results.length,
        limit: 20,
      },
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Get tenant details',
    description: 'Retrieve tenant information. Admin role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant details retrieved successfully',
    type: TenantResponse,
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
  async getTenant(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<TenantResponse> {
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant name or subdomain. Admin role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponse,
  })
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
  ): Promise<TenantResponse> {
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

  @Patch(':id/services')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Update tenant services',
    description:
      'Enable or disable services for the tenant. Admin role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services updated successfully',
    type: ServiceUpdateResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid service name(s)',
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
  async updateServices(
    @Param('id') id: string,
    @Body() updateServicesDto: UpdateServicesDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ServiceUpdateResponse> {
    const tenant = await this.tenantsService.updateServices(
      id,
      user.tenantId,
      updateServicesDto.services,
    );

    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        enabledServices: tenant.enabled_services,
        updatedAt: tenant.updated_at,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(':id/users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get users in tenant',
    description:
      'Retrieve all users in the tenant with roles. Requires tenant membership.',
  })
  @ApiResponse({
    status: 200,
    description: 'User list retrieved successfully',
    type: UsersInTenantResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not a member of this tenant',
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getUsersInTenant(
    @Param('id') id: string,
    @Query() queryDto: GetUsersQueryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<UsersInTenantResponse> {
    const result = await this.tenantsService.getUsersInTenant(
      id,
      user.tenantId,
      user.userId,
      queryDto,
    );

    return {
      success: true,
      data: result.users,
      meta: result.meta,
    };
  }

  @Delete(':id/users/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Remove user from tenant',
    description:
      'Remove a user from the organization. Requires admin role. Cannot remove yourself.',
  })
  @ApiResponse({
    status: 200,
    description: 'User removed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cannot remove yourself',
  })
  async removeUserFromTenant(
    @Param('id') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() admin: RequestUser,
  ) {
    const result = await this.tenantsService.removeUserFromTenant(
      tenantId,
      userId,
      admin.userId,
      admin.tenantId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
