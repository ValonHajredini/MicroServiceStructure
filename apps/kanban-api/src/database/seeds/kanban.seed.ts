import { randomUUID } from "node:crypto";
import dataSource from "../data-source";
import { BoardEntity, BoardStatus } from "../../boards/entities/board.entity";
import { ColumnEntity } from "../../columns/entities/column.entity";
import { TaskEntity, TaskPriority } from "../../tasks/entities/task.entity";
import { TaskCommentEntity } from "../../tasks/entities/task-comment.entity";

export async function seedKanbanData() {
  const tenantId =
    process.env.SEED_TENANT_ID ?? "11111111-1111-1111-1111-111111111111";
  const ownerUserId =
    process.env.SEED_OWNER_USER_ID ?? "22222222-2222-2222-2222-222222222222";
  const commenterUserId = process.env.SEED_COMMENT_USER_ID ?? ownerUserId;

  await dataSource.initialize();

  const boardRepository = dataSource.getRepository(BoardEntity);
  const columnRepository = dataSource.getRepository(ColumnEntity);
  const taskRepository = dataSource.getRepository(TaskEntity);
  const commentRepository = dataSource.getRepository(TaskCommentEntity);

  await commentRepository.delete({});
  await taskRepository.delete({});
  await columnRepository.delete({});
  await boardRepository.delete({});

  const boards = await boardRepository.save([
    {
      id: randomUUID(),
      tenant_id: tenantId,
      owner_id: ownerUserId,
      name: "Project Alpha",
      description: "Kanban board tracking project Alpha initiatives",
      status: BoardStatus.ACTIVE,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      owner_id: ownerUserId,
      name: "Personal Tasks",
      description: "Personal productivity board",
      status: BoardStatus.ACTIVE,
    },
  ]);

  const [alphaBoard, personalBoard] = boards;

  const alphaColumns = await columnRepository.save(
    [
      { title: "To Do", position: 0 },
      { title: "In Progress", position: 1 },
      { title: "Review", position: 2 },
      { title: "Done", position: 3 },
    ].map((column) => ({
      id: randomUUID(),
      tenant_id: tenantId,
      board_id: alphaBoard.id,
      ...column,
    })),
  );

  const personalColumns = await columnRepository.save(
    [
      { title: "To Do", position: 0 },
      { title: "In Progress", position: 1 },
      { title: "Done", position: 2 },
    ].map((column) => ({
      id: randomUUID(),
      tenant_id: tenantId,
      board_id: personalBoard.id,
      ...column,
    })),
  );

  const tasks = await taskRepository.save([
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: alphaColumns[0].id,
      board_id: alphaBoard.id,
      title: "Draft project charter",
      description: "Capture scope, objectives, and stakeholders",
      assigned_to: ownerUserId,
      priority: TaskPriority.HIGH,
      due_date: new Date(),
      position: 0,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: alphaColumns[0].id,
      board_id: alphaBoard.id,
      title: "Gather requirements",
      description: "Meet with product team to discuss requirements",
      assigned_to: ownerUserId,
      priority: TaskPriority.MEDIUM,
      position: 1,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: alphaColumns[1].id,
      board_id: alphaBoard.id,
      title: "Build auth module",
      description: "Implement JWT authentication for API",
      assigned_to: ownerUserId,
      priority: TaskPriority.HIGH,
      position: 0,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: alphaColumns[1].id,
      board_id: alphaBoard.id,
      title: "Design Kanban schema",
      priority: TaskPriority.MEDIUM,
      position: 1,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: alphaColumns[2].id,
      board_id: alphaBoard.id,
      title: "API contract review",
      description: "Review API contract with frontend team",
      assigned_to: ownerUserId,
      priority: TaskPriority.MEDIUM,
      position: 0,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: alphaColumns[3].id,
      board_id: alphaBoard.id,
      title: "Deploy base infrastructure",
      description: "Provision staging infrastructure for Kanban service",
      assigned_to: ownerUserId,
      priority: TaskPriority.LOW,
      position: 0,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: personalColumns[0].id,
      board_id: personalBoard.id,
      title: "Plan weekly meals",
      priority: TaskPriority.MEDIUM,
      position: 0,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: personalColumns[0].id,
      board_id: personalBoard.id,
      title: "Schedule dentist appointment",
      priority: TaskPriority.HIGH,
      position: 1,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: personalColumns[1].id,
      board_id: personalBoard.id,
      title: "Clean garage",
      priority: TaskPriority.LOW,
      position: 0,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: personalColumns[1].id,
      board_id: personalBoard.id,
      title: "Organize digital photos",
      priority: TaskPriority.LOW,
      position: 1,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: personalColumns[2].id,
      board_id: personalBoard.id,
      title: "Submit tax documents",
      priority: TaskPriority.HIGH,
      position: 0,
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      column_id: personalColumns[2].id,
      board_id: personalBoard.id,
      title: "Call mom",
      priority: TaskPriority.MEDIUM,
      position: 1,
    },
  ]);

  const comments = tasks.slice(0, 6).map((task, index) => ({
    id: randomUUID(),
    tenant_id: tenantId,
    task_id: task.id,
    user_id: commenterUserId,
    content: `Sample comment ${index + 1} for task ${task.title}`,
  }));

  await commentRepository.save(
    comments.map((comment) => ({
      ...comment,
      created_at: new Date(),
      updated_at: new Date(),
    })),
  );

  console.log("Kanban seed data inserted successfully.");
  await dataSource.destroy();
}

if (process.env.NODE_ENV !== "test") {
  seedKanbanData().catch(async (error) => {
    console.error("Kanban seed failed", error);
    await dataSource.destroy();
    process.exit(1);
  });
}
