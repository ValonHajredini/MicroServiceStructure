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

describe("TasksController (e2e)", () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantATokenUserB: string;
  let tenantATokenAdmin: string;
  let tenantBToken: string;
  let tenantABoardId: string;
  let tenantABoardOwnerId: string;
  let tenantBBoardId: string;
  let tenantAColumnId: string;
  let tenantASecondColumnId: string;
  let tenantAWipLimitColumnId: string;
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

    tenantAToken = createTenantAToken("user-a");
    tenantATokenUserB = createTenantAToken("user-b");
    tenantATokenAdmin = createTestToken({
      sub: "admin-user",
      email: "admin@tenant-a.com",
      tenantId: "tenant-a",
      roles: ["admin"],
    });
    tenantBToken = createTenantBToken();

    // Create boards for each tenant
    const boardAResponse = await request(app.getHttpServer())
      .post("/api/v1/boards")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ name: "Tenant A Board" });
    tenantABoardId = boardAResponse.body.id;
    tenantABoardOwnerId = "user-a"; // Board owner

    const boardBResponse = await request(app.getHttpServer())
      .post("/api/v1/boards")
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ name: "Tenant B Board" });
    tenantBBoardId = boardBResponse.body.id;

    // Create columns for tenant A
    const columnAResponse = await request(app.getHttpServer())
      .post(`/api/v1/boards/${tenantABoardId}/columns`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "To Do", position: 0 });
    tenantAColumnId = columnAResponse.body.id;

    const columnSecondResponse = await request(app.getHttpServer())
      .post(`/api/v1/boards/${tenantABoardId}/columns`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "In Progress", position: 1 });
    tenantASecondColumnId = columnSecondResponse.body.id;

    // Create column with WIP limit for tenant A
    const wipColumnResponse = await request(app.getHttpServer())
      .post(`/api/v1/boards/${tenantABoardId}/columns`)
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ title: "WIP Limited Column", position: 2, wip_limit: 2 });
    tenantAWipLimitColumnId = wipColumnResponse.body.id;

    // Create column for tenant B
    const columnBResponse = await request(app.getHttpServer())
      .post(`/api/v1/boards/${tenantBBoardId}/columns`)
      .set("Authorization", `Bearer ${tenantBToken}`)
      .send({ title: "To Do", position: 0 });
    tenantBColumnId = columnBResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/v1/columns/:columnId/tasks", () => {
    it("should create a task with all fields for tenant A column", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Test Task A",
          description: "Test description",
          assignedTo: "user-a",
          priority: "high",
          dueDate: "2025-12-31T00:00:00Z",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("title", "Test Task A");
          expect(res.body).toHaveProperty("description", "Test description");
          expect(res.body).toHaveProperty("assigned_to", "user-a");
          expect(res.body).toHaveProperty("priority", "high");
          expect(res.body).toHaveProperty("due_date");
          expect(res.body).toHaveProperty("tenant_id", "tenant-a");
          expect(res.body).toHaveProperty("column_id", tenantAColumnId);
          expect(res.body).toHaveProperty("board_id", tenantABoardId);
          expect(res.body).toHaveProperty("position");
          expect(typeof res.body.position).toBe("number");
        });
    });

    it("should create a task with minimal fields (auto-assign position)", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Minimal Task",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("title", "Minimal Task");
          expect(res.body).toHaveProperty("priority", "medium"); // Default
          expect(res.body).toHaveProperty("position");
          expect(res.body.position).toBeGreaterThanOrEqual(0);
        });
    });

    it("should auto-assign position as max position + 1", async () => {
      // Create first task
      const firstTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantASecondColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "First Task" })
        .expect(201);

      const firstPosition = firstTask.body.position;

      // Create second task
      const secondTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantASecondColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({ title: "Second Task" })
        .expect(201);

      expect(secondTask.body.position).toBe(firstPosition + 1);
    });

    it("should reject creating task for another tenant column", () => {
      // Tenant A tries to create task on Tenant B's column
      return request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantBColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Unauthorized Task",
        })
        .expect(404); // Should not find the column (tenant scoped)
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .send({
          title: "Unauthorized Task",
        })
        .expect(401);
    });

    it("should validate required fields", () => {
      return request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("GET /api/v1/tasks/:id", () => {
    let tenantATaskId: string;

    beforeAll(async () => {
      // Create a task for tenant A
      const taskResponse = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task to Retrieve",
          description: "This is a test task",
        });
      tenantATaskId = taskResponse.body.id;
    });

    it("should return task with comments relation", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${tenantATaskId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", tenantATaskId);
          expect(res.body).toHaveProperty("title", "Task to Retrieve");
          expect(res.body).toHaveProperty("description", "This is a test task");
          expect(res.body).toHaveProperty("comments");
          expect(Array.isArray(res.body.comments)).toBe(true);
        });
    });

    it("should not return task from another tenant", () => {
      // Tenant B tries to access Tenant A's task
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${tenantATaskId}`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .expect(404);
    });

    it("should reject request without authentication", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${tenantATaskId}`)
        .expect(401);
    });
  });

  describe("PATCH /api/v1/tasks/:id", () => {
    let taskForAssignee: string;
    let taskForOwner: string;
    let taskForAdmin: string;
    let taskForUnauthorized: string;

    beforeAll(async () => {
      // Create tasks for different authorization scenarios
      const assigneeTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Assignee",
          assignedTo: "user-b",
        });
      taskForAssignee = assigneeTask.body.id;

      const ownerTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Owner",
        });
      taskForOwner = ownerTask.body.id;

      const adminTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Admin",
        });
      taskForAdmin = adminTask.body.id;

      const unauthorizedTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Unauthorized",
          assignedTo: "other-user",
        });
      taskForUnauthorized = unauthorizedTask.body.id;
    });

    it("should update task if user is the assignee", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForAssignee}`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .send({
          title: "Updated by Assignee",
          description: "Updated description",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("title", "Updated by Assignee");
          expect(res.body).toHaveProperty("description", "Updated description");
        });
    });

    it("should update task if user is the board owner", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForOwner}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Updated by Owner",
          priority: "low",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("title", "Updated by Owner");
          expect(res.body).toHaveProperty("priority", "low");
        });
    });

    it("should update task if user is tenant admin", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForAdmin}`)
        .set("Authorization", `Bearer ${tenantATokenAdmin}`)
        .send({
          title: "Updated by Admin",
          priority: "high",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("title", "Updated by Admin");
          expect(res.body).toHaveProperty("priority", "high");
        });
    });

    it("should reject update if user is unauthorized", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForUnauthorized}`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .send({
          title: "Unauthorized Update",
        })
        .expect(403);
    });

    it("should update task with column_id change (move task)", async () => {
      const taskToMove = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task to Move",
        });
      const taskId = taskToMove.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          columnId: tenantASecondColumnId,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("column_id", tenantASecondColumnId);
        });
    });

    it("should reject update from another tenant", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForOwner}`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({
          title: "Cross Tenant Update",
        })
        .expect(404);
    });
  });

  describe("DELETE /api/v1/tasks/:id", () => {
    let taskForAssignee: string;
    let taskForOwner: string;
    let taskForAdmin: string;
    let taskForUnauthorized: string;

    beforeAll(async () => {
      // Create tasks for different authorization scenarios
      const assigneeTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Assignee Delete",
          assignedTo: "user-b",
        });
      taskForAssignee = assigneeTask.body.id;

      const ownerTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Owner Delete",
        });
      taskForOwner = ownerTask.body.id;

      const adminTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Admin Delete",
        });
      taskForAdmin = adminTask.body.id;

      const unauthorizedTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Unauthorized Delete",
          assignedTo: "other-user",
        });
      taskForUnauthorized = unauthorizedTask.body.id;
    });

    it("should soft delete task if user is the assignee", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskForAssignee}`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
        });
    });

    it("should soft delete task if user is the board owner", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskForOwner}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
        });
    });

    it("should soft delete task if user is tenant admin", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskForAdmin}`)
        .set("Authorization", `Bearer ${tenantATokenAdmin}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
        });
    });

    it("should reject delete if user is unauthorized", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskForUnauthorized}`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .expect(403);
    });

    it("should not find deleted task", async () => {
      const taskToDelete = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task to Delete and Verify",
        });
      const taskId = taskToDelete.body.id;

      // Delete the task
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200);

      // Try to retrieve deleted task
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404);
    });

    it("should reject delete from another tenant", () => {
      const taskToDelete = request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Cross Tenant Delete",
        });

      return taskToDelete.then((taskResponse) => {
        return request(app.getHttpServer())
          .delete(`/api/v1/tasks/${taskResponse.body.id}`)
          .set("Authorization", `Bearer ${tenantBToken}`)
          .expect(404);
      });
    });
  });

  describe("PATCH /api/v1/tasks/:id/move", () => {
    let taskToMove: string;
    let taskInColumn1: string;
    let taskInColumn2: string;

    beforeAll(async () => {
      // Create tasks in different columns for move testing
      const moveTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task to Move",
        });
      taskToMove = moveTask.body.id;

      const col1Task = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task in Column 1",
        });
      taskInColumn1 = col1Task.body.id;

      const col2Task = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantASecondColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task in Column 2",
        });
      taskInColumn2 = col2Task.body.id;
    });

    it("should move task to different column and update position", async () => {
      const moveResponse = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskToMove}/move`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          columnId: tenantASecondColumnId,
          position: 0,
        })
        .expect(200);

      expect(moveResponse.body).toHaveProperty(
        "column_id",
        tenantASecondColumnId,
      );
      expect(moveResponse.body).toHaveProperty("position", 0);

      // Verify task position was adjusted correctly
      const verifyResponse = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskInColumn2}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(200);
      expect(verifyResponse.body.position).toBeGreaterThan(0);
    });

    it("should reject move to column from different board", () => {
      // Create a task in tenant B
      return request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantBColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({
          title: "Task in Tenant B",
        })
        .then((taskResponse) => {
          // Try to move tenant A task to tenant B column
          return request(app.getHttpServer())
            .patch(`/api/v1/tasks/${taskInColumn1}/move`)
            .set("Authorization", `Bearer ${tenantAToken}`)
            .send({
              columnId: tenantBColumnId,
              position: 0,
            })
            .expect(404);
        });
    });

    it("should reject move from another tenant", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskInColumn1}/move`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({
          columnId: tenantASecondColumnId,
          position: 0,
        })
        .expect(404);
    });

    it("should reject move if user is unauthorized", async () => {
      // Create a task assigned to a different user
      const assignedTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Unauthorized Move",
          assignedTo: "other-user", // assigned to different user
        });

      // Try to move task as user-b (not assignee, not board owner, not admin)
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${assignedTask.body.id}/move`)
        .set("Authorization", `Bearer ${tenantATokenUserB}`)
        .send({
          columnId: tenantASecondColumnId,
          position: 0,
        })
        .expect(403);
    });

    it("should allow move if user is board owner", async () => {
      // Create task not assigned to anyone
      const unassignedTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Unassigned Task",
        });

      // Board owner (user-a) should be able to move it
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${unassignedTask.body.id}/move`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          columnId: tenantASecondColumnId,
          position: 0,
        })
        .expect(200);
    });

    it("should allow move if user is tenant admin", async () => {
      // Create task assigned to different user
      const assignedTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task for Admin Move",
          assignedTo: "other-user",
        });

      // Admin should be able to move it
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${assignedTask.body.id}/move`)
        .set("Authorization", `Bearer ${tenantATokenAdmin}`)
        .send({
          columnId: tenantASecondColumnId,
          position: 0,
        })
        .expect(200);
    });
  });

  describe("WIP Limit Enforcement", () => {
    let task1InWipColumn: string;
    let task2InWipColumn: string;
    let task3InWipColumn: string;
    let taskToMoveToWip: string;

    beforeAll(async () => {
      // Fill WIP-limited column to capacity (limit is 2)
      const task1 = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAWipLimitColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task 1 in WIP Column",
        });
      task1InWipColumn = task1.body.id;

      const task2 = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAWipLimitColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task 2 in WIP Column",
        });
      task2InWipColumn = task2.body.id;

      // Create a third task that will exceed limit
      const task3 = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAWipLimitColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task 3 in WIP Column",
        });
      task3InWipColumn = task3.body.id;

      // Create a task to move to WIP column
      const moveTask = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task to Move to WIP Column",
        });
      taskToMoveToWip = moveTask.body.id;
    });

    it("should allow moving task to column at WIP limit (optional enforcement)", async () => {
      // According to Story 4.3, WIP limit enforcement is optional
      // The service allows moves even when at limit (logs warning)
      // So this should succeed
      const moveResponse = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskToMoveToWip}/move`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          columnId: tenantAWipLimitColumnId,
          position: 0,
        })
        .expect(200);

      expect(moveResponse.body).toHaveProperty(
        "column_id",
        tenantAWipLimitColumnId,
      );
    });

    it("should allow creating task in column at WIP limit", () => {
      // According to Story 4.3, WIP limit is not strictly enforced
      // Creating directly in column at limit should still work
      return request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAWipLimitColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Task Over Limit",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("column_id", tenantAWipLimitColumnId);
        });
    });
  });

  describe("Tenant Isolation", () => {
    let tenantATaskId: string;
    let tenantBTaskId: string;

    beforeAll(async () => {
      // Create tasks for each tenant
      const taskA = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantAColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Tenant A Task",
        });
      tenantATaskId = taskA.body.id;

      const taskB = await request(app.getHttpServer())
        .post(`/api/v1/columns/${tenantBColumnId}/tasks`)
        .set("Authorization", `Bearer ${tenantBToken}`)
        .send({
          title: "Tenant B Task",
        });
      tenantBTaskId = taskB.body.id;
    });

    it("should not allow tenant A to access tenant B task", () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tasks/${tenantBTaskId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404);
    });

    it("should not allow tenant A to update tenant B task", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tasks/${tenantBTaskId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .send({
          title: "Unauthorized Update",
        })
        .expect(404);
    });

    it("should not allow tenant A to delete tenant B task", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/tasks/${tenantBTaskId}`)
        .set("Authorization", `Bearer ${tenantAToken}`)
        .expect(404);
    });
  });
});
