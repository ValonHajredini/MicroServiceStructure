import { TenantContextMiddleware } from './tenant-context.middleware';
import { UnauthorizedException } from '@nestjs/common';

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new TenantContextMiddleware();
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should extract tenantId from authenticated user', () => {
    mockRequest.user = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      email: 'test@example.com',
    };

    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.tenantId).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(mockRequest.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when user is missing', () => {
    mockRequest.user = null;

    expect(() => {
      middleware.use(mockRequest, mockResponse, mockNext);
    }).toThrow(UnauthorizedException);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when tenantId is missing', () => {
    mockRequest.user = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
    };

    expect(() => {
      middleware.use(mockRequest, mockResponse, mockNext);
    }).toThrow(UnauthorizedException);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException with correct message', () => {
    mockRequest.user = null;

    expect(() => {
      middleware.use(mockRequest, mockResponse, mockNext);
    }).toThrow('Tenant context missing from request');
  });
});
