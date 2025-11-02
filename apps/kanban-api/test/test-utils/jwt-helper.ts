import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "../../src/auth/interfaces/jwt-payload.interface";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
const jwtService = new JwtService({
  secret: JWT_SECRET,
});

export function createTestToken(payload: Partial<JwtPayload>): string {
  const defaultPayload: JwtPayload = {
    sub: "test-user-id",
    email: "test@example.com",
    tenantId: "test-tenant-id",
    roles: ["user"],
    enabledServices: ["kanban"],
  };

  const fullPayload = { ...defaultPayload, ...payload };
  return jwtService.sign(fullPayload, { expiresIn: "1h" });
}

export function createTenantAToken(userId = "user-a"): string {
  return createTestToken({
    sub: userId,
    email: "user-a@tenant-a.com",
    tenantId: "tenant-a",
  });
}

export function createTenantBToken(userId = "user-b"): string {
  return createTestToken({
    sub: userId,
    email: "user-b@tenant-b.com",
    tenantId: "tenant-b",
  });
}
