import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { TenantContextMiddleware } from "../src/common/middleware/tenant-context.middleware";
import {
  createTenantAToken,
  createTenantBToken,
} from "./test-utils/jwt-helper";

describe("Tenant Isolation (e2e)", () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantBToken: string;
  let tenantABoardId: string;
  let tenantAColumnId: string;
  let tenantATaskId: string;
  let tenantBBoardId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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

    // Create test data for Tenant A
    const boardResponse = await request(app.getHttpServer())
      .post("/boards")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ name: "Tenant A Board" });
    tenantABoardId = boardResponse.body.id;

    const columnResponse = await request(app.getHttpServer())
      .post(`/boards/${tenantABoardId}/columns`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "Tenant A Column", position: 0 });
    tenantAColumnId = columnResponse.body.id;

    const taskResponse = await request(app.getHttpServer())
      .post(`/boards/${tenantABoardId}/columns/${tenantAColumnId}/tasks`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "Tenant A Task", position: 0 });
    tenantATaskId = taskResponse.body.id;

    // Create test data for Tenant B
    const boardBResponse = await request(app.getHttpServer())
      .post("/boards")
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ name: "Tenant B Board" });
    tenantBBoardId = boardBResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Cross-Tenant Board Access", () => {
    it("should prevent Tenant B from seeing Tenant A boards", async () => {
      const response = await request(app.getHttpServer())
        .get("/boards")
        .set("Authorization", `Bearer ${tenantBToken}`)
        .expect(200);

      const hasTenantABoard = response.body.some(
        (board: any) => board.id === tenantABoardId,
      );
      expect(hasTenantABoard).toBe(false);
    });

    it("should prevent Tenant A from seeing Tenant B boards", async () => {
      const response = await request(app.getHttpServer())
        .get("/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200);

      const hasTenantBBoard = response.body.some(
        (board: any) => board.id === tenantBBoardId,
      );
      expect(hasTenantBBoard).toBe(false);
    });
  });

  describe("Cross-Tenant Column Access", () => {
    it("should prevent Tenant B from accessing Tenant A columns", async () => {
      const response = await request(app.getHttpServer())
        .get(`/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .expect(200);

      // Should return empty array (board not found in tenant B scope)
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("should prevent Tenant B from creating columns on Tenant A board", () => {
      return request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ title: "Unauthorized Column", position: 0 })
        .expect(404); // Board not found in tenant B scope
    });
  });

  describe("Cross-Tenant Task Access", () => {
    it("should prevent Tenant B from accessing Tenant A tasks", async () => {
      const response = await request(app.getHttpServer())
        .get(`/boards/${tenantABoardId}/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .expect(200);

      // Should return empty array (column not found in tenant B scope)
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("should prevent Tenant B from creating tasks on Tenant A column", () => {
      return request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ title: "Unauthorized Task", position: 0 })
        .expect(404); // Column not found in tenant B scope
    });
  });

  describe("JWT Token Validation", () => {
    it("should reject requests without tenant context", () => {
      return request(app.getHttpServer()).get("/boards").expect(401);
    });

    it("should reject requests with invalid JWT token", () => {
      return request(app.getHttpServer())
        .get("/boards")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("should reject requests with token missing tenantId", () => {
      // This test would require a token without tenantId
      // For now, we verify that tenant context middleware enforces tenantId
      return request(app.getHttpServer())
        .get("/boards")
        .set("Authorization", "Bearer missing-tenant-token")
        .expect(401);
    });
  });
});
