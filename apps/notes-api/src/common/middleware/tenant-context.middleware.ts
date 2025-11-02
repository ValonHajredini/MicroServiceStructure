import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to extract tenant context from authenticated user
 *
 * Note: This middleware runs BEFORE guards in NestJS request lifecycle.
 * It checks if req.user exists (set by previous middleware or early auth)
 * but doesn't enforce authentication - that's the JwtAuthGuard's job.
 *
 * This middleware:
 * 1. Extracts tenantId from req.user if available (set by Passport JWT strategy)
 * 2. Stores tenantId and userId in request object for use in repositories
 * 3. Skips if no user context (guard will handle authentication)
 *
 * Tenant isolation must be enforced at application level by:
 * - Always including tenant_id in WHERE clauses
 * - Never allowing users to access cross-tenant data
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant context from authenticated user if present
    // Note: req.user is set by Passport after JWT validation
    // If not present, we skip - the JwtAuthGuard will handle authentication
    if (req.user && (req.user as any).tenantId) {
      (req as any).tenantId = (req.user as any).tenantId;
      // JWT strategy returns 'sub' as the user ID
      (req as any).userId = (req.user as any).sub;
    }
    // Continue to next middleware/guard regardless
    // JwtAuthGuard will enforce authentication if route requires it
    next();
  }
}
