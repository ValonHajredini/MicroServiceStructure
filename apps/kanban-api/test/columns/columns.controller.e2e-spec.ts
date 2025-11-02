import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TenantContextMiddleware } from "../../src/common/middleware/tenant-context.middleware";
import {
  createTenantAToken,
  createTenantBToken,
} from "../test-utils/jwt-helper";

describe("ColumnsController (e2e)", () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantBToken: string;
  let tenantABoardId: string;
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

    // Create boards for each tenant
    const boardAResponse = await request(app.getHttpServer())
      .post("/boards")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ name: "Tenant A Board" });
    tenantABoardId = boardAResponse.body.id;

    const boardBResponse = await request(app.getHttpServer())
      .post("/boards")
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ name: "Tenant B Board" });
    tenantBBoardId = boardBResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /boards/:boardId/columns", () => {
    it("should create a column for tenant A board", () => {
      return request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "To Do",
          position: 0,
          wipLimit: 5,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("title", "To Do");
          expect(res.body).toHaveProperty("tenant_id", "tenant-a");
          expect(res.body).toHaveProperty("board_id", tenantABoardId);
        });
    });

    it("should reject creating column for another tenant board", () => {
      // Tenant A tries to create column on Tenant B's board
      return request(app.getHttpServer())
        .post(`/boards/${tenantBBoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Unauthorized Column",
          position: 0,
        })
        .expect(404); // Should not find the board (tenant scoped)
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns`)
        .send({
          title: "Unauthorized Column",
          position: 0,
        })
        .expect(401);
    });
  });

  describe("GET /boards/:boardId/columns", () => {
    let tenantAColumnId: string;
    let tenantBColumnId: string;

    beforeAll(async () => {
      // Create columns for each tenant
      const columnAResponse = await request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Tenant A Column", position: 0 });
      tenantAColumnId = columnAResponse.body.id;

      const columnBResponse = await request(app.getHttpServer())
        .post(`/boards/${tenantBBoardId}/columns`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ title: "Tenant B Column", position: 0 });
      tenantBColumnId = columnBResponse.body.id;
    });

    it("should return only tenant A columns for tenant A board", () => {
      return request(app.getHttpServer())
        .get(`/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((column: any) => {
            expect(column.tenant_id).toBe("tenant-a");
            expect(column.board_id).toBe(tenantABoardId);
          });
          // Should not include tenant B's column
          const hasTenantBColumn = res.body.some(
            (column: any) => column.id === tenantBColumnId,
          );
          expect(hasTenantBColumn).toBe(false);
        });
    });

    it("should not return columns when accessing another tenant board", () => {
      // Tenant A tries to access Tenant B's board columns
      return request(app.getHttpServer())
        .get(`/boards/${tenantBBoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          // Should return empty array or not find the board (tenant scoped)
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });
  });
});
