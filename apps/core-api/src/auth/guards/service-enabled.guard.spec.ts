import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ServiceEnabledGuard } from './service-enabled.guard';
import { JwtPayload } from '@shared-types';

describe('ServiceEnabledGuard', () => {
  let guard: ServiceEnabledGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceEnabledGuard, Reflector],
    }).compile();

    guard = module.get<ServiceEnabledGuard>(ServiceEnabledGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (
    user: Partial<JwtPayload> | null,
  ): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
        }),
      }),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no required service is specified', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const context = createMockExecutionContext({
      enabledServices: ['notes'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required service enabled', () => {
    jest.spyOn(reflector, 'get').mockReturnValue('notes');
    const context = createMockExecutionContext({
      enabledServices: ['notes', 'kanban'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user does not have the required service enabled', () => {
    jest.spyOn(reflector, 'get').mockReturnValue('forms');
    const context = createMockExecutionContext({
      enabledServices: ['notes', 'kanban'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "Service 'forms' is not enabled for your organization",
    );
  });

  it('should throw ForbiddenException if user object is missing', () => {
    jest.spyOn(reflector, 'get').mockReturnValue('notes');
    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Service access information not available',
    );
  });

  it('should throw ForbiddenException if enabledServices is missing', () => {
    jest.spyOn(reflector, 'get').mockReturnValue('notes');
    const context = createMockExecutionContext({ email: 'test@example.com' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Service access information not available',
    );
  });

  it('should handle empty enabledServices array', () => {
    jest.spyOn(reflector, 'get').mockReturnValue('notes');
    const context = createMockExecutionContext({ enabledServices: [] });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "Service 'notes' is not enabled for your organization",
    );
  });
});
