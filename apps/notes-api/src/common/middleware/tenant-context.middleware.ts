import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to extract and validate tenant context from authenticated user
 * Requires JWT authentication to be applied first via JwtAuthGuard
 *
 * This middleware:
 * 1. Extracts tenantId from the JWT payload attached by JwtStrategy
 * 2. Stores tenantId in request object for use in repositories
 * 3. Throws UnauthorizedException if tenant context is missing
 *
 * Tenant isolation must be enforced at application level by:
 * - Always including tenant_id in WHERE clauses
 * - Never allowing users to access cross-tenant data
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant context from authenticated user (attached by JWT strategy)
    if (req.user && (req.user as any).tenantId) {
      (req as any).tenantId = (req.user as any).tenantId;
      (req as any).userId = (req.user as any).userId;
    } else {
      throw new UnauthorizedException('Tenant context missing from request');
    }
    next();
  }
}
