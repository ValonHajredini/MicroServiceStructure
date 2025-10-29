import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  enabledServices: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'poc-secret-key-hs256',
    });
  }

  async validate(payload: JwtPayload) {
    // Log tenant extraction for POC demonstration
    console.log('[JWT Strategy] Token validated for tenant:', payload.tenantId);
    console.log('[JWT Strategy] Full payload:', payload);

    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      enabledServices: payload.enabledServices,
    };
  }
}
