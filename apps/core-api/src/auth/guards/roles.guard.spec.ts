import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    const context = createMockExecutionContext({
      userId: 'user-id',
      tenantId: 'tenant-id',
      roles: ['user'],
    });

    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const context = createMockExecutionContext({
      userId: 'user-id',
      tenantId: 'tenant-id',
      roles: ['admin'],
    });

    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    const context = createMockExecutionContext({
      userId: 'user-id',
      tenantId: 'tenant-id',
      roles: ['user'],
    });

    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has one of multiple required roles', () => {
    const context = createMockExecutionContext({
      userId: 'user-id',
      tenantId: 'tenant-id',
      roles: ['user', 'editor'],
    });

    jest.spyOn(reflector, 'get').mockReturnValue(['admin', 'editor']);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user object is missing', () => {
    const context = createMockExecutionContext(null);

    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access when user.roles is undefined', () => {
    const context = createMockExecutionContext({
      userId: 'user-id',
      tenantId: 'tenant-id',
    });

    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);

    expect(guard.canActivate(context)).toBe(false);
  });
});

function createMockExecutionContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
  } as any as ExecutionContext;
}
