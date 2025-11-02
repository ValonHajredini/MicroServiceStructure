import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { TenantContextMiddleware } from "../../src/common/middleware/tenant-context.middleware";
import {
  createTenantAToken,
  createTenantBToken,
  createTestToken,
} from "../test-utils/jwt-helper";

describe("TaskCommentsController (e2e)", () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantATokenUserB: string;
  let tenantATokenAdmin: string;
  let tenantBToken: string;
  let tenantATaskId: string;
  let tenantBTaskId: string;

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

    tenantAToken = createTenantAToken("user-a");
    tenantATokenUserB = createTenantAToken("user-b");
    tenantATokenAdmin = createTestToken({
      sub: "admin-user",
      email: "admin@tenant-a.com",
      tenantId: "tenant-a",
      roles: ["admin"],
    });
    tenantBToken = createTenantBToken();

    // Create boards and columns
    const boardAResponse = await request(app.getHttpServer())
      .post("/api/v1/boards")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ name: "Tenant A Board" });
    const tenantABoardId = boardAResponse.body.id;

    const columnAResponse = await request(app.getHttpServer())
      .post(`/api/v1/boards/${tenantABoardId}/columns`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "To Do", position: 0 });
    const tenantAColumnId = columnAResponse.body.id;

    // Create task for tenant A
    const taskAResponse = await request(app.getHttpServer())
      .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "Test Task A" });
    tenantATaskId = taskAResponse.body.id;

    // Create task for tenant B
    const boardBResponse = await request(app.getHttpServer())
      .post("/api/v1/boards")
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ name: "Tenant B Board" });
    const tenantBBoardId = boardBResponse.body.id;

    const columnBResponse = await request(app.getHttpServer())
      .post(`/api/v1/boards/${tenantBBoardId}/columns`)
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ title: "To Do", position: 0 });
    const tenantBColumnId = columnBResponse.body.id;

    const taskBResponse = await request(app.getHttpServer())
      .post(`/api/v1/columns/${tenantBColumnId}/tasks`)
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ title: "Test Task B" });
    tenantBTaskId = taskBResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/v1/tasks/:taskId/comments", () => {
    it("should create comment with user_id from JWT", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "This looks good" })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("content", "This looks good");
          expect(res.body).toHaveProperty("user_id", "user-a");
          expect(res.body).toHaveProperty("task_id", tenantATaskId);
          expect(res.body).toHaveProperty("tenant_id", "tenant-a");
          expect(res.body).toHaveProperty("status", "active");
        });
    });

    it("should return 404 if task not found", () => {
      return request(app.getHttpServer())
        .post("/api/v1/tasks/non-existent-task/comments")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Comment" })
        .expect(404);
    });

    it("should enforce tenant isolation", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantBTaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Comment from tenant A" })
        .expect(404); // Task not found in tenant A scope
    });
  });

  describe("GET /api/v1/tasks/:id/comments", () => {
    let commentId1: string;
    let commentId2: string;

    beforeAll(async () => {
      // Create comments
      const comment1 = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "First comment" });
      commentId1 = comment1.body.id;

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const comment2 = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .send({ content: "Second comment" });
      commentId2 = comment2.body.id;
    });

    it("should return comments ordered by created_at ASC", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          // Verify ordering (first comment should be earlier)
          const firstIndex = res.body.findIndex(
            (c: any) => c.id === commentId1,
          );
          const secondIndex = res.body.findIndex(
            (c: any) => c.id === commentId2,
          );
          expect(firstIndex).toBeLessThan(secondIndex);
        });
    });

    it("should return 404 if task not found", () => {
      return request(app.getHttpServer())
        .get("/api/v1/tasks/non-existent-task/comments")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404);
    });

    it("should enforce tenant isolation", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${tenantBTaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404);
    });
  });

  describe("PATCH /api/v1/comments/:id", () => {
    let commentId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Original comment" });
      commentId = response.body.id;
    });

    it("should update comment if authorized (author)", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/comments/${commentId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Updated by author" })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("content", "Updated by author");
          expect(res.body).toHaveProperty("id", commentId);
        });
    });

    it("should update comment if authorized (admin)", async () => {
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Comment to update" });
      const newCommentId = commentResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/comments/${newCommentId}`)
        .set("Authorization", `Bearer ${tenantATokenAdmin}`)
        .send({ content: "Updated by admin" })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("content", "Updated by admin");
        });
    });

    it("should return 403 if unauthorized", async () => {
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "User A comment" });
      const newCommentId = commentResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/comments/${newCommentId}`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .send({ content: "Unauthorized update" })
        .expect(403);
    });

    it("should return 404 if comment not found", () => {
      return request(app.getHttpServer())
        .patch("/api/v1/comments/non-existent-comment")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Update" })
        .expect(404);
    });
  });

  describe("DELETE /api/v1/comments/:id", () => {
    let commentId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Comment to delete" });
      commentId = response.body.id;
    });

    it("should soft delete comment if authorized (author)", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/comments/${commentId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
        });
    });

    it("should soft delete comment if authorized (admin)", async () => {
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "Comment to delete by admin" });
      const newCommentId = commentResponse.body.id;

      return request(app.getHttpServer())
        .delete(`/api/v1/comments/${newCommentId}`)
        .set("Authorization", `Bearer ${tenantATokenAdmin}`)
        .expect(200);
    });

    it("should return 403 if unauthorized", async () => {
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${tenantATaskId}/comments`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ content: "User A comment" });
      const newCommentId = commentResponse.body.id;

      return request(app.getHttpServer())
        .delete(`/api/v1/comments/${newCommentId}`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .expect(403);
    });

    it("should return 404 if comment not found", () => {
      return request(app.getHttpServer())
        .delete("/api/v1/comments/non-existent-comment")
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404);
    });
  });
});
