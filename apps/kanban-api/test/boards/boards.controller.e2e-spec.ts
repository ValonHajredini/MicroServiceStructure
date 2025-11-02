import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TenantContextMiddleware } from "../../src/common/middleware/tenant-context.middleware";
import {
  createTenantAToken,
  createTenantBToken,
} from "../test-utils/jwt-helper";

describe("BoardsController (e2e)", () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantBToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply tenant context middleware
    const tenantMiddleware = app.get(TenantContextMiddleware);
    app.use(tenantMiddleware.use.bind(tenantMiddleware));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    tenantAToken = createTenantAToken();
    tenantBToken = createTenantBToken();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /boards", () => {
    it("should create a board for tenant A", () => {
      return request(app.getHttpServer())
        .post("/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          name: "Test Board A",
          description: "Test description",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("name", "Test Board A");
          expect(res.body).toHaveProperty("tenant_id", "tenant-a");
          expect(res.body).toHaveProperty("owner_id");
        });
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .post("/boards")
        .send({
          name: "Unauthorized Board",
        })
        .expect(401);
    });
  });

  describe("GET /boards", () => {
    let boardAId: string;
    let boardBId: string;

    beforeAll(async () => {
      // Create board for tenant A
      const boardAResponse = await request(app.getHttpServer())
        .post("/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ name: "Tenant A Board" });
      boardAId = boardAResponse.body.id;

      // Create board for tenant B
      const boardBResponse = await request(app.getHttpServer())
        .post("/boards")
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ name: "Tenant B Board" });
      boardBId = boardBResponse.body.id;
    });

    it("should return only tenant A boards for tenant A user", () => {
      return request(app.getHttpServer())
        .get("/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((board: any) => {
            expect(board.tenant_id).toBe("tenant-a");
          });
          // Should not include tenant B's board
          const hasTenantBBoard = res.body.some(
            (board: any) => board.id === boardBId,
          );
          expect(hasTenantBBoard).toBe(false);
        });
    });

    it("should return only tenant B boards for tenant B user", () => {
      return request(app.getHttpServer())
        .get("/boards")
        .set("Authorization", `Bearer ${tenantBToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((board: any) => {
            expect(board.tenant_id).toBe("tenant-b");
          });
          // Should not include tenant A's board
          const hasTenantABoard = res.body.some(
            (board: any) => board.id === boardAId,
          );
          expect(hasTenantABoard).toBe(false);
        });
    });
  });
});
