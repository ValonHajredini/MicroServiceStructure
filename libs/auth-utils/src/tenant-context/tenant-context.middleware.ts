import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // For POC: Extract tenant from x-tenant-id header
    // In production: Extract from JWT token (req.user.tenantId from Story 1.2)
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing. Provide x-tenant-id header.');
    }

    // Set tenant context for this request using AsyncLocalStorage
    this.tenantContext.run(tenantId, () => {
      next();
    });
  }
}
