import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('invitations')
@Controller('users')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 invitations per hour
  @ApiOperation({
    summary: 'Invite user to tenant',
    description:
      'Send an invitation email to a new user. Admin role required. Returns invitation details without the token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid email format or role',
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
    status: 409,
    description: 'Conflict - User already exists or pending invitation exists',
  })
  async inviteUser(
    @Body() createDto: CreateInvitationDto,
    @CurrentUser() user: RequestUser,
  ) {
    const invitation = await this.invitationsService.createInvitation(
      createDto,
      user.tenantId,
      user.userId,
    );

    return {
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
        status: invitation.status,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('invite/:token')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Validate invitation token',
    description:
      'Retrieve invitation details by token. Public endpoint (no JWT required).',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invitation has expired or already used',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Invalid invitation link',
  })
  async getInvitationByToken(@Param('token') token: string) {
    const invitation =
      await this.invitationsService.getInvitationByToken(token);

    return {
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        tenantName: invitation.tenant.name,
        inviterName: `${invitation.invitedBy.first_name} ${invitation.invitedBy.last_name}`,
        expiresAt: invitation.expires_at,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
