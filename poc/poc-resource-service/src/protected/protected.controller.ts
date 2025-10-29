import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('protected')
export class ProtectedController {
  @Get('resource')
  @UseGuards(JwtAuthGuard)
  getProtectedResource(@Request() req: any) {
    // Extract tenant context from validated JWT
    const { userId, email, tenantId, roles, enabledServices } = req.user;

    console.log('[Protected Resource] Request from tenant:', tenantId);
    console.log('[Protected Resource] User:', email, 'Roles:', roles);

    return {
      message: 'Successfully accessed protected resource',
      timestamp: new Date().toISOString(),
      user: {
        userId,
        email,
        tenantId,
        roles,
        enabledServices,
      },
      resource: {
        id: 'resource-123',
        name: 'Sample Protected Resource',
        description: 'This resource is protected by JWT authentication',
      },
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'poc-resource-service',
      timestamp: new Date().toISOString(),
    };
  }
}
