import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user object with valid payload', () => {
    const payload: JwtPayload = {
      sub: 'user-id',
      email: 'test@example.com',
      tenantId: 'tenant-id',
      roles: ['admin'],
      enabledServices: ['notes'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };

    const result = strategy.validate(payload);

    expect(result).toEqual({
      userId: 'user-id',
      email: 'test@example.com',
      tenantId: 'tenant-id',
      roles: ['admin'],
      enabledServices: ['notes'],
    });
  });

  it('should throw UnauthorizedException if sub is missing', () => {
    const payload = {
      email: 'test@example.com',
      tenantId: 'tenant-id',
      roles: ['admin'],
      enabledServices: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    } as JwtPayload;

    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    expect(() => strategy.validate(payload)).toThrow('Invalid token payload');
  });

  it('should throw UnauthorizedException if tenantId is missing', () => {
    const payload = {
      sub: 'user-id',
      email: 'test@example.com',
      roles: ['admin'],
      enabledServices: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    } as JwtPayload;

    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    expect(() => strategy.validate(payload)).toThrow('Invalid token payload');
  });

  it('should handle payload with empty roles array', () => {
    const payload: JwtPayload = {
      sub: 'user-id',
      email: 'test@example.com',
      tenantId: 'tenant-id',
      roles: [],
      enabledServices: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };

    const result = strategy.validate(payload);

    expect(result.roles).toEqual([]);
  });

  it('should handle payload with undefined roles', () => {
    const payload = {
      sub: 'user-id',
      email: 'test@example.com',
      tenantId: 'tenant-id',
      enabledServices: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    } as JwtPayload;

    const result = strategy.validate(payload);

    expect(result.roles).toEqual([]);
  });
});
