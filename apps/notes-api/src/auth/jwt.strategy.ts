import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * JWT Strategy for validating tokens issued by Core Service
 * Uses shared JWT_SECRET across all microservices
 *
 * This strategy:
 * 1. Extracts JWT from Authorization header (Bearer token)
 * 2. Validates signature using shared JWT_SECRET
 * 3. Extracts user context (userId, tenantId, roles, enabledServices)
 * 4. Attaches user object to request for use in controllers/middleware
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      enabledServices: payload.enabledServices,
    };
  }
}
