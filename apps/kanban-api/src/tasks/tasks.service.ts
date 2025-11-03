import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TasksRepository } from "./repositories/tasks.repository";
import { ColumnEntity, ColumnStatus } from "../columns/entities/column.entity";
import { TaskEntity, TaskPriority, TaskStatus } from "./entities/task.entity";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { BoardsRepository } from "../boards/repositories/boards.repository";
import { TaskActivityService } from "./task-activity.service";
import { TaskActionType } from "./entities/task-activity.entity";
import { KanbanGateway } from "../websocket/kanban.gateway";

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly columnsRepository: ColumnsRepository,
    private readonly boardsRepository: BoardsRepository,
    private readonly activityService: TaskActivityService,
    private readonly kanbanGateway: KanbanGateway,
  ) {}

  async create(
    columnId: string,
    createTaskDto: CreateTaskDto,
    tenantId: string,
    userId?: string,
  ): Promise<TaskEntity> {
    // Verify column exists and belongs to tenant
    const column = await this.columnsRepository.findOne({
      where: {
        id: columnId,
        tenant_id: tenantId,
        status: ColumnStatus.ACTIVE,
      } as any,
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${columnId} not found`);
    }

    // Get board_id from column
    const boardId = column.board_id;

    // Auto-assign position (max position + 1 in column)
    const existingTasks = await this.tasksRepository.find({
      where: {
        column_id: columnId,
        tenant_id: tenantId,
        status: TaskStatus.ACTIVE,
      } as any,
      order: { position: "DESC" },
      take: 1,
    });

    const position =
      existingTasks.length > 0 ? existingTasks[0].position + 1 : 0;

    // Create task with tenant_id, board_id, column_id
    const task = await this.tasksRepository.save({
      tenant_id: tenantId,
      column_id: columnId,
      board_id: boardId,
      title: createTaskDto.title,
      description: createTaskDto.description ?? null,
      assigned_to: createTaskDto.assignedTo ?? null,
      priority: createTaskDto.priority ?? TaskPriority.MEDIUM,
      due_date: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
      position,
      status: TaskStatus.ACTIVE,
    });

    // Log activity: task created
    if (userId) {
      await this.activityService.logActivity(
        task.id,
        TaskActionType.CREATED,
        userId,
        tenantId,
      );
    }

    // Emit WebSocket event: task created
    this.kanbanGateway.emitTaskCreated(boardId, tenantId, task);

    return task;
  }

  async findOne(id: string, _tenantId: string): Promise<TaskEntity> {
    const task = await this.tasksRepository.findOne({
      where: { id, status: TaskStatus.ACTIVE } as any,
      relations: ["comments"],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<TaskEntity> {
    const task = await this.tasksRepository.findOne({
      where: { id, status: TaskStatus.ACTIVE } as any,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check authorization: task assignee, board owner, or tenant admin
    const isAssignee = task.assigned_to === userId;
    const isAdmin = userRoles.includes("admin");

    // Get board to check ownership
    const board = await this.boardsRepository.findOne({
      where: { id: task.board_id } as any,
    });
    const isBoardOwner = board?.owner_id === userId;

    if (!isAssignee && !isBoardOwner && !isAdmin) {
      throw new ForbiddenException(
        "You do not have permission to update this task",
      );
    }

    // Track changes for activity logging
    const oldAssignedTo = task.assigned_to;
    let hasOtherChanges = false;

    // Update task fields
    if (updateTaskDto.title !== undefined) {
      task.title = updateTaskDto.title;
      hasOtherChanges = true;
    }
    if (updateTaskDto.description !== undefined) {
      task.description = updateTaskDto.description ?? null;
      hasOtherChanges = true;
    }
    if (updateTaskDto.assignedTo !== undefined) {
      task.assigned_to = updateTaskDto.assignedTo ?? null;
    }
    if (updateTaskDto.priority !== undefined) {
      task.priority = updateTaskDto.priority;
      hasOtherChanges = true;
    }
    if (updateTaskDto.dueDate !== undefined) {
      task.due_date = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : null;
      hasOtherChanges = true;
    }

    // Handle column_id change (move task, update position)
    if (
      updateTaskDto.columnId !== undefined &&
      updateTaskDto.columnId !== task.column_id
    ) {
      await this.moveTask(
        id,
        updateTaskDto.columnId,
        task.position,
        tenantId,
        userId,
        userRoles,
      );
      // Reload task to get updated position
      const updatedTask = await this.tasksRepository.findOne({
        where: { id, status: TaskStatus.ACTIVE } as any,
      });
      return updatedTask!;
    }

    const updatedTask = await this.tasksRepository.save(task);

    // Log activity: assigned or updated
    if (
      updateTaskDto.assignedTo !== undefined &&
      oldAssignedTo !== updateTaskDto.assignedTo
    ) {
      await this.activityService.logActivity(
        id,
        TaskActionType.ASSIGNED,
        userId,
        tenantId,
        oldAssignedTo ?? undefined,
        updateTaskDto.assignedTo ?? undefined,
      );
    } else if (hasOtherChanges) {
      await this.activityService.logActivity(
        id,
        TaskActionType.UPDATED,
        userId,
        tenantId,
      );
    }

    // Emit WebSocket event: task updated
    this.kanbanGateway.emitTaskUpdated(
      updatedTask.board_id,
      tenantId,
      updatedTask,
    );

    return updatedTask;
  }

  async remove(
    id: string,
    _tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<void> {
    const task = await this.tasksRepository.findOne({
      where: { id, status: TaskStatus.ACTIVE } as any,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check authorization: task assignee, board owner, or tenant admin
    const isAssignee = task.assigned_to === userId;
    const isAdmin = userRoles.includes("admin");

    // Get board to check ownership
    const board = await this.boardsRepository.findOne({
      where: { id: task.board_id } as any,
    });
    const isBoardOwner = board?.owner_id === userId;

    if (!isAssignee && !isBoardOwner && !isAdmin) {
      throw new ForbiddenException(
        "You do not have permission to delete this task",
      );
    }

    // Soft delete task (set status = 'deleted')
    task.status = TaskStatus.DELETED;
    await this.tasksRepository.save(task);
  }

  async moveTask(
    taskId: string,
    targetColumnId: string,
    newPosition: number,
    tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<TaskEntity> {
    // Verify both columns belong to same board and tenant
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, status: TaskStatus.ACTIVE } as any,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Check authorization: task assignee, board owner, or tenant admin
    const isAssignee = task.assigned_to === userId;
    const isAdmin = userRoles.includes("admin");

    // Get board to check ownership
    const board = await this.boardsRepository.findOne({
      where: { id: task.board_id } as any,
    });
    const isBoardOwner = board?.owner_id === userId;

    if (!isAssignee && !isBoardOwner && !isAdmin) {
      throw new ForbiddenException(
        "You do not have permission to move this task",
      );
    }

    const sourceColumn = await this.columnsRepository.findOne({
      where: { id: task.column_id } as any,
    });

    const targetColumn = await this.columnsRepository.findOne({
      where: { id: targetColumnId, status: ColumnStatus.ACTIVE } as any,
    });

    if (!targetColumn) {
      throw new NotFoundException(
        `Target column with ID ${targetColumnId} not found`,
      );
    }

    if (!sourceColumn || sourceColumn.board_id !== targetColumn.board_id) {
      throw new BadRequestException(
        "Source and target columns must belong to the same board",
      );
    }

    // Store old column name for activity log
    const oldColumnName = sourceColumn.title;
    const newColumnName = targetColumn.title;

    // Update column_id and position
    task.column_id = targetColumnId;

    // Get existing tasks in target column to adjust positions
    const targetColumnTasks = await this.tasksRepository.find({
      where: { column_id: targetColumnId, status: TaskStatus.ACTIVE } as any,
      order: { position: "ASC" },
    });

    // Adjust positions to make room for new position
    for (const t of targetColumnTasks) {
      if (t.id === taskId) continue; // Skip the task being moved
      if (t.position >= newPosition) {
        t.position += 1;
        await this.tasksRepository.save(t);
      }
    }

    task.position = newPosition;

    // Optionally check WIP limit (if column has limit)
    if (targetColumn.wip_limit) {
      const taskCount = targetColumnTasks.length;
      if (taskCount >= targetColumn.wip_limit) {
        // Allow move but could log warning or throw based on enforcement
        // For now, we'll allow it as per Story 4.3's optional enforcement
      }
    }

    const movedTask = await this.tasksRepository.save(task);

    // Log activity: moved (or completed if moved to "Done" column)
    const isCompleted =
      targetColumn.title.toLowerCase().includes("done") ||
      targetColumn.title.toLowerCase().includes("complete");
    await this.activityService.logActivity(
      taskId,
      isCompleted ? TaskActionType.COMPLETED : TaskActionType.MOVED,
      userId,
      tenantId,
      oldColumnName,
      newColumnName,
    );

    // Emit WebSocket event: task moved
    this.kanbanGateway.emitTaskMoved(
      movedTask.board_id,
      tenantId,
      taskId,
      sourceColumn.id,
      targetColumnId,
      newPosition,
    );

    return movedTask;
  }

  findByColumn(columnId: string): Promise<TaskEntity[]> {
    return this.tasksRepository.findByColumn(columnId);
  }
}
