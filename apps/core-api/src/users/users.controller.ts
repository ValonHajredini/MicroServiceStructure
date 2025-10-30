import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { UserRoleUpdateResponse } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id/role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({
    summary: 'Change user role',
    description:
      'Change a user\'s role within the tenant. Requires admin role. Cannot change own role.',
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    type: UserRoleUpdateResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid role',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required or user not in same tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Cannot change your own role',
  })
  async changeUserRole(
    @Param('id') userId: string,
    @Body() changeRoleDto: ChangeRoleDto,
    @CurrentUser() admin: RequestUser,
  ): Promise<UserRoleUpdateResponse> {
    const result = await this.usersService.changeUserRole(
      userId,
      changeRoleDto.role,
      admin.userId,
      admin.tenantId,
    );

    return {
      success: true,
      data: result,
    };
  }
}
