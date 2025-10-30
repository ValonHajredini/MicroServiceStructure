import {
  Controller,
  Post,
  Get,
  Patch,
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
import { JoinRequestsService } from './join-requests.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { UpdateJoinRequestDto } from './dto/update-join-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('join-requests')
@Controller('tenants')
export class JoinRequestsController {
  constructor(private readonly joinRequestsService: JoinRequestsService) {}

  @Post(':id/join-requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Create join request',
    description: 'Request to join a tenant organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Join request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Tenant not found or inactive',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Already a member or pending request exists',
  })
  async createJoinRequest(
    @Param('id') tenantId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateJoinRequestDto,
  ) {
    const joinRequest = await this.joinRequestsService.createJoinRequest(
      tenantId,
      user.userId,
      dto,
    );

    return {
      success: true,
      data: {
        id: joinRequest.id,
        tenantId: joinRequest.tenant_id,
        status: joinRequest.status,
        createdAt: joinRequest.created_at,
      },
    };
  }

  @Get(':tenantId/join-requests')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get join requests for tenant',
    description:
      'Retrieve all join requests for a tenant. Admin role required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Join requests retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getJoinRequests(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const { data, total } =
      await this.joinRequestsService.getJoinRequestsForTenant(
        tenantId,
        user.tenantId,
        page || 1,
        limit || 20,
        status,
      );

    return {
      success: true,
      data: data.map((jr) => ({
        id: jr.id,
        user: {
          id: jr.user.id,
          email: jr.user.email,
          firstName: jr.user.first_name,
          lastName: jr.user.last_name,
        },
        message: jr.message,
        status: jr.status,
        createdAt: jr.created_at,
      })),
      meta: {
        page: page || 1,
        limit: limit || 20,
        total,
      },
    };
  }

  @Patch('join-requests/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Approve or reject join request',
    description:
      'Approve or reject a join request. Admin role required. On approval, user is added to tenant with user role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Join request updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid action',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required or not admin of this tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Join request not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Join request already processed',
  })
  async updateJoinRequest(
    @Param('id') requestId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateJoinRequestDto,
  ) {
    const joinRequest = await this.joinRequestsService.updateJoinRequest(
      requestId,
      user.tenantId,
      dto,
    );

    return {
      success: true,
      data: {
        id: joinRequest.id,
        status: joinRequest.status,
        adminResponse: joinRequest.admin_response,
        updatedAt: joinRequest.updated_at,
      },
    };
  }
}
