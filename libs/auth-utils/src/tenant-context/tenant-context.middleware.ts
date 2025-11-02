import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly jwtService: JwtService,
  ) {}

  use(req: TenantRequest, res: Response, next: NextFunction): void {
    // Production: Extract tenant from JWT token
    const existingTenant = (req.user as any)?.tenantId ?? req.tenantId;
    const existingUserId = (req.user as any)?.userId ?? (req.user as any)?.sub;

    if (!existingTenant) {
      const bearer = req.headers.authorization;
      if (bearer?.startsWith('Bearer ')) {
        const token = bearer.replace('Bearer ', '').trim();
        try {
          const payload = this.jwtService.verify(token);
          if (payload?.tenantId) {
            req.tenantId = payload.tenantId;
            req.userId = payload.sub;

            // Set tenant context for this request using AsyncLocalStorage
            this.tenantContext.run(payload.tenantId, () => {
              next();
            });
            return;
          }
        } catch (error) {
          throw new UnauthorizedException('Invalid authentication token');
        }
      }
      throw new UnauthorizedException('Tenant context missing from JWT');
    }

    req.tenantId = existingTenant;
    req.userId = existingUserId;

    // Set tenant context for this request using AsyncLocalStorage
    this.tenantContext.run(existingTenant, () => {
      next();
    });
  }
}
