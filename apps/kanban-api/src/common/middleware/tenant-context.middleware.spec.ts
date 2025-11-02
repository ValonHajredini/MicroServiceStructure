import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TenantContextMiddleware } from "./tenant-context.middleware";

const jwtService = new JwtService({ secret: "test-secret" });

describe("TenantContextMiddleware", () => {
  it("should reuse tenant from authenticated request", () => {
    const middleware = new TenantContextMiddleware(jwtService);
    const request: any = {
      user: { tenantId: "tenant-123", userId: "user-123" },
    };
    const next = jest.fn();

    middleware.use(request, {} as any, next);

    expect(request.tenantId).toBe("tenant-123");
    expect(request.userId).toBe("user-123");
    expect(next).toHaveBeenCalled();
  });

  it("should decode bearer token when user not populated", () => {
    const middleware = new TenantContextMiddleware(jwtService);
    const payload = { sub: "user-456", tenantId: "tenant-456" };
    const token = jwtService.sign(payload);

    const request: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const next = jest.fn();

    middleware.use(request, {} as any, next);

    expect(request.tenantId).toBe("tenant-456");
    expect(request.userId).toBe("user-456");
    expect(next).toHaveBeenCalled();
  });

  it("should throw when tenant context missing", () => {
    const middleware = new TenantContextMiddleware(jwtService);
    const request: any = { headers: {} };

    expect(() => middleware.use(request, {} as any, jest.fn())).toThrow(
      UnauthorizedException,
    );
  });
});
