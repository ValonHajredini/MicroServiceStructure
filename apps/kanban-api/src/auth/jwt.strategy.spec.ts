import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";

const configService: any = {
  get: jest.fn().mockReturnValue("secret"),
};

const strategy = new JwtStrategy(configService);

describe("JwtStrategy", () => {
  it("should return validated payload", async () => {
    const result = await strategy.validate({
      sub: "user-001",
      email: "user@example.com",
      tenantId: "tenant-001",
      roles: ["admin"],
    } as any);

    expect(result).toEqual(
      expect.objectContaining({
        userId: "user-001",
        email: "user@example.com",
        tenantId: "tenant-001",
        roles: ["admin"],
      }),
    );
  });

  it("should throw when payload missing tenant information", async () => {
    await expect(
      strategy.validate({ sub: "user-002" } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
