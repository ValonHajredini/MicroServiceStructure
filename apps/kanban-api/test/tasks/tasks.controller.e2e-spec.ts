import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TenantContextMiddleware } from "../../src/common/middleware/tenant-context.middleware";
import {
  createTenantAToken,
  createTenantBToken,
} from "../test-utils/jwt-helper";

describe("TasksController (e2e)", () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantBToken: string;
  let tenantABoardId: string;
  let tenantBBoardId: string;
  let tenantAColumnId: string;
  let tenantBColumnId: string;

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

    // Create boards and columns for each tenant
    const boardAResponse = await request(app.getHttpServer())
      .post("/boards")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ name: "Tenant A Board" });
    tenantABoardId = boardAResponse.body.id;

    const columnAResponse = await request(app.getHttpServer())
      .post(`/boards/${tenantABoardId}/columns`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "To Do", position: 0 });
    tenantAColumnId = columnAResponse.body.id;

    const boardBResponse = await request(app.getHttpServer())
      .post("/boards")
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ name: "Tenant B Board" });
    tenantBBoardId = boardBResponse.body.id;

    const columnBResponse = await request(app.getHttpServer())
      .post(`/boards/${tenantBBoardId}/columns`)
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ title: "To Do", position: 0 });
    tenantBColumnId = columnBResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /boards/:boardId/columns/:columnId/tasks", () => {
    it("should create a task for tenant A column", () => {
      return request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Test Task A",
          description: "Test description",
          priority: "high",
          position: 0,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("title", "Test Task A");
          expect(res.body).toHaveProperty("tenant_id", "tenant-a");
          expect(res.body).toHaveProperty("column_id", tenantAColumnId);
          expect(res.body).toHaveProperty("board_id", tenantABoardId);
        });
    });

    it("should reject creating task for another tenant column", () => {
      // Tenant A tries to create task on Tenant B's column
      return request(app.getHttpServer())
        .post(`/boards/${tenantBBoardId}/columns/${tenantBColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Unauthorized Task",
          position: 0,
        })
        .expect(404); // Should not find the column (tenant scoped)
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns/${tenantAColumnId}/tasks`)
        .send({
          title: "Unauthorized Task",
          position: 0,
        })
        .expect(401);
    });
  });

  describe("GET /boards/:boardId/columns/:columnId/tasks", () => {
    let tenantATaskId: string;
    let tenantBTaskId: string;

    beforeAll(async () => {
      // Create tasks for each tenant
      const taskAResponse = await request(app.getHttpServer())
        .post(`/boards/${tenantABoardId}/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Tenant A Task", position: 0 });
      tenantATaskId = taskAResponse.body.id;

      const taskBResponse = await request(app.getHttpServer())
        .post(`/boards/${tenantBBoardId}/columns/${tenantBColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({ title: "Tenant B Task", position: 0 });
      tenantBTaskId = taskBResponse.body.id;
    });

    it("should return only tenant A tasks for tenant A column", () => {
      return request(app.getHttpServer())
        .get(`/boards/${tenantABoardId}/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((task: any) => {
            expect(task.tenant_id).toBe("tenant-a");
            expect(task.column_id).toBe(tenantAColumnId);
          });
          // Should not include tenant B's task
          const hasTenantBTask = res.body.some(
            (task: any) => task.id === tenantBTaskId,
          );
          expect(hasTenantBTask).toBe(false);
        });
    });

    it("should not return tasks when accessing another tenant column", () => {
      // Tenant A tries to access Tenant B's column tasks
      return request(app.getHttpServer())
        .get(`/boards/${tenantBBoardId}/columns/${tenantBColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          // Should return empty array (tenant scoped)
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });
  });
});
