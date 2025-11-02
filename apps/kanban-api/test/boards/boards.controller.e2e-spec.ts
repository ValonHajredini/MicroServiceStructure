import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TenantContextMiddleware } from "../../src/common/middleware/tenant-context.middleware";
import { TransformInterceptor } from "../../src/common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import {
  createTenantAToken,
  createTenantBToken,
  createTestToken,
} from "../test-utils/jwt-helper";

describe("BoardsController (e2e)", () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantBToken: string;
  let adminToken: string;

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

    // Apply global interceptors and filters
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    tenantAToken = createTenantAToken();
    tenantBToken = createTenantBToken();
    adminToken = createTestToken({
      sub: "admin-user",
      email: "admin@tenant-a.com",
      tenantId: "tenant-a",
      roles: ["admin"],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/v1/boards", () => {
    it("should create board with name, description, owner_id from JWT", () => {
      return request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          name: "Test Board",
          description: "Test description",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty("id");
          expect(res.body.data.name).toBe("Test Board");
          expect(res.body.data.description).toBe("Test description");
          expect(res.body.data.tenant_id).toBe("tenant-a");
          expect(res.body.data.owner_id).toBe("user-a");
          expect(res.body.meta).toHaveProperty("timestamp");
        });
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .post("/api/v1/boards")
        .send({
          name: "Unauthorized Board",
        })
        .expect(401);
    });

    it("should reject invalid DTO", () => {
      return request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          name: "",
        })
        .expect(400);
    });
  });

  describe("GET /api/v1/boards", () => {
    let boardAId: string;
    let boardBId: string;

    beforeAll(async () => {
      // Create boards for testing
      const boardAResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ name: "Tenant A Board 1" });
      boardAId = boardAResponse.body.data.id;

      await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ name: "Tenant A Board 2" });

      const boardBResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ name: "Tenant B Board" });
      boardBId = boardBResponse.body.data.id;
    });

    it("should return tenant's boards with pagination", () => {
      return request(app.getHttpServer())
        .get("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta.pagination).toBeDefined();
          expect(res.body.meta.pagination.page).toBe(1);
          expect(res.body.meta.pagination.limit).toBe(20);
          expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(2);
          res.body.data.forEach((board: any) => {
            expect(board.tenant_id).toBe("tenant-a");
          });
        });
    });

    it("should handle pagination query params", () => {
      return request(app.getHttpServer())
        .get("/api/v1/boards?page=1&limit=1")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.pagination.limit).toBe(1);
          expect(res.body.data.length).toBeLessThanOrEqual(1);
        });
    });

    it("should not return other tenant's boards", () => {
      return request(app.getHttpServer())
        .get("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          const hasTenantBBoard = res.body.data.some(
            (board: any) => board.id === boardBId,
          );
          expect(hasTenantBBoard).toBe(false);
        });
    });
  });

  describe("GET /api/v1/boards/:id", () => {
    let boardId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ name: "Board with Relations" });
      boardId = response.body.data.id;
    });

    it("should return board with columns and tasks", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/boards/${boardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(boardId);
          expect(res.body.data).toHaveProperty("columns");
          expect(Array.isArray(res.body.data.columns)).toBe(true);
        });
    });

    it("should return 404 for non-existent board", () => {
      return request(app.getHttpServer())
        .get("/api/v1/boards/invalid-uuid")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe("NOT_FOUND");
        });
    });

    it("should not return other tenant's board", async () => {
      const tenantBResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ name: "Tenant B Board" });
      const tenantBBoardId = tenantBResponse.body.data.id;

      return request(app.getHttpServer())
        .get(`/api/v1/boards/${tenantBBoardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404);
    });
  });

  describe("PATCH /api/v1/boards/:id", () => {
    let ownerBoardId: string;
    let otherUserBoardId: string;

    beforeAll(async () => {
      const ownerResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ name: "Owner Board", description: "Original" });
      ownerBoardId = ownerResponse.body.data.id;

      const otherUserToken = createTenantAToken("other-user");
      const otherResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({ name: "Other User Board" });
      otherUserBoardId = otherResponse.body.data.id;
    });

    it("should update board if user is owner", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/boards/${ownerBoardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          name: "Updated Name",
          description: "Updated Description",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe("Updated Name");
          expect(res.body.data.description).toBe("Updated Description");
        });
    });

    it("should update board if user is admin", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/boards/${otherUserBoardId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Admin Updated",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.name).toBe("Admin Updated");
        });
    });

    it("should return 403 if user is not owner or admin", () => {
      const regularUserToken = createTenantAToken("regular-user");
      return request(app.getHttpServer())
        .patch(`/api/v1/boards/${otherUserBoardId}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send({
          name: "Unauthorized Update",
        })
        .expect(403)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe("FORBIDDEN");
        });
    });
  });

  describe("DELETE /api/v1/boards/:id", () => {
    let ownerBoardId: string;
    let otherUserBoardId: string;

    beforeAll(async () => {
      const ownerResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ name: "Board to Delete" });
      ownerBoardId = ownerResponse.body.data.id;

      const otherUserToken = createTenantAToken("other-user");
      const otherResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({ name: "Other Board" });
      otherUserBoardId = otherResponse.body.data.id;
    });

    it("should soft delete board if user is owner", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/boards/${ownerBoardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.message).toBe("Board deleted successfully");
        });
    });

    it("should soft delete board if user is admin", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/boards/${otherUserBoardId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("should return 403 if user is not owner or admin", () => {
      const regularUserToken = createTenantAToken("regular-user");
      return request(app.getHttpServer())
        .delete(`/api/v1/boards/${otherUserBoardId}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it("should not return soft-deleted board in GET /boards", async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ name: "Board to Soft Delete" });
      const boardId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/boards/${boardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .get("/api/v1/boards")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          const foundBoard = res.body.data.find(
            (board: any) => board.id === boardId,
          );
          expect(foundBoard).toBeUndefined();
        });
    });
  });
});
