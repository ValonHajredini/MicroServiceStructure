import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request, Response, NextFunction } from "express";

interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: TenantRequest, _res: Response, next: NextFunction): void {
    const existingTenant = (req.user as any)?.tenantId ?? req.tenantId;
    const existingUserId = (req.user as any)?.userId ?? (req.user as any)?.userId;

    if (!existingTenant) {
      const bearer = req.headers.authorization;
      if (bearer?.startsWith("Bearer ")) {
        const token = bearer.replace("Bearer ", "").trim();
        try {
          const payload = this.jwtService.verify(token);
          if (payload?.tenantId) {
            req.tenantId = payload.tenantId;
            req.userId = payload.sub;
            return next();
          }
        } catch (error) {
          throw new UnauthorizedException("Invalid authentication token");
        }
      }
      throw new UnauthorizedException("Tenant context missing from JWT");
    }

    req.tenantId = existingTenant;
    req.userId =
      existingUserId ?? (req.user as any)?.userId ?? (req.user as any)?.sub;
    next();
  }
}
