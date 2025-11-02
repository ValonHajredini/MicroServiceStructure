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

  describe("POST /api/v1/boards/:boardId/columns", () => {
    it("should create a column with position for tenant A board", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "To Do",
          position: 0,
          wip_limit: 5,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("title", "To Do");
          expect(res.body).toHaveProperty("tenant_id", "tenant-a");
          expect(res.body).toHaveProperty("board_id", tenantABoardId);
          expect(res.body).toHaveProperty("position", 0);
        });
    });

    it("should create a column with auto-assigned position when not provided", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "In Progress",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("title", "In Progress");
          expect(res.body).toHaveProperty("position");
          expect(typeof res.body.position).toBe("number");
        });
    });

    it("should reject creating column for another tenant board", () => {
      // Tenant A tries to create column on Tenant B's board
      return request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantBBoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Unauthorized Column",
          position: 0,
        })
        .expect(404); // Should not find the board (tenant scoped)
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .send({
          title: "Unauthorized Column",
          position: 0,
        })
        .expect(401);
    });
  });

  describe("PATCH /api/v1/columns/:id", () => {
    let tenantAColumnId: string;

    beforeAll(async () => {
      const columnResponse = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Test Column", position: 0 });
      tenantAColumnId = columnResponse.body.id;
    });

    it("should update column title", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/columns/${tenantAColumnId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Updated Title" })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("title", "Updated Title");
        });
    });

    it("should update column position and reorder others", async () => {
      // Create two more columns
      const col2 = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Column 2", position: 1 });

      const col3 = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Column 3", position: 2 });

      // Move column 3 to position 0
      return request(app.getHttpServer())
        .patch(`/api/v1/columns/${col3.body.id}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ position: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("position", 0);
        });
    });

    it("should reject updating column from another tenant", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/columns/${tenantAColumnId}`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ title: "Unauthorized Update" })
        .expect(404);
    });
  });

  describe("DELETE /api/v1/columns/:id", () => {
    let columnToDeleteId: string;
    let firstColumnId: string;

    beforeAll(async () => {
      // Create columns for deletion test
      const firstCol = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "First Column", position: 0 });
      firstColumnId = firstCol.body.id;

      const deleteCol = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Column To Delete", position: 1 });
      columnToDeleteId = deleteCol.body.id;
    });

    it("should soft delete column", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/columns/${columnToDeleteId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
        });
    });

    it("should not find deleted column", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/boards/${tenantABoardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          const deletedColumn = res.body.columns?.find(
            (col: any) => col.id === columnToDeleteId,
          );
          expect(deletedColumn).toBeUndefined();
        });
    });
  });

  describe("PATCH /api/v1/boards/:boardId/columns/reorder", () => {
    let col1Id: string;
    let col2Id: string;
    let col3Id: string;

    beforeAll(async () => {
      // Create three columns for reordering
      const c1 = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Column 1", position: 0 });
      col1Id = c1.body.id;

      const c2 = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Column 2", position: 1 });
      col2Id = c2.body.id;

      const c3 = await request(app.getHttpServer())
        .post(`/api/v1/boards/${tenantABoardId}/columns`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Column 3", position: 2 });
      col3Id = c3.body.id;
    });

    it("should reorder columns", async () => {
      // Reorder: 2, 1, 3
      await request(app.getHttpServer())
        .patch(`/api/v1/boards/${tenantABoardId}/columns/reorder`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ columnIds: [col2Id, col1Id, col3Id] })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
        });

      // Verify order
      const boardResponse = await request(app.getHttpServer())
        .get(`/api/v1/boards/${tenantABoardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200);

      const columns = boardResponse.body.columns;
      expect(columns[0].id).toBe(col2Id);
      expect(columns[1].id).toBe(col1Id);
      expect(columns[2].id).toBe(col3Id);
    });

    it("should reject reorder with invalid column IDs", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/boards/${tenantABoardId}/columns/reorder`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ columnIds: ["invalid-id"] })
        .expect(404);
    });
  });

  describe("GET /api/v1/boards/:id (includes columns sorted by position)", () => {
    it("should return board with columns sorted by position", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/boards/${tenantABoardId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("columns");
      expect(Array.isArray(response.body.columns)).toBe(true);

      // Verify columns are sorted by position
      if (response.body.columns.length > 1) {
        for (let i = 0; i < response.body.columns.length - 1; i++) {
          expect(response.body.columns[i].position).toBeLessThanOrEqual(
            response.body.columns[i + 1].position,
          );
        }
      }
    });
  });
});
