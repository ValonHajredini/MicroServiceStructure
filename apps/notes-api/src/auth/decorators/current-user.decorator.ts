import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * @CurrentUser() Decorator
 * Extracts JWT payload (user context) from request object
 *
 * Usage in controller:
 * @Get()
 * findAll(@CurrentUser() user: JwtPayload) {
 *   // Access user.sub (userId), user.tenantId, user.roles, etc.
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
