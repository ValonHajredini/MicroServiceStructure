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

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly columnsRepository: ColumnsRepository,
    private readonly boardsRepository: BoardsRepository,
  ) {}

  async create(
    columnId: string,
    createTaskDto: CreateTaskDto,
    _tenantId: string,
  ): Promise<TaskEntity> {
    // Verify column exists and belongs to tenant
    const column = await this.columnsRepository.findOne({
      where: {
        id: columnId,
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
        status: TaskStatus.ACTIVE,
      } as any,
      order: { position: "DESC" },
      take: 1,
    });

    const position =
      existingTasks.length > 0 ? existingTasks[0].position + 1 : 0;

    // Create task with tenant_id, board_id, column_id
    return this.tasksRepository.save({
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
    _tenantId: string,
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

    // Update task fields
    if (updateTaskDto.title !== undefined) {
      task.title = updateTaskDto.title;
    }
    if (updateTaskDto.description !== undefined) {
      task.description = updateTaskDto.description ?? null;
    }
    if (updateTaskDto.assignedTo !== undefined) {
      task.assigned_to = updateTaskDto.assignedTo ?? null;
    }
    if (updateTaskDto.priority !== undefined) {
      task.priority = updateTaskDto.priority;
    }
    if (updateTaskDto.dueDate !== undefined) {
      task.due_date = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : null;
    }

    // Handle column_id change (move task, update position)
    if (
      updateTaskDto.columnId !== undefined &&
      updateTaskDto.columnId !== task.column_id
    ) {
      await this.moveTask(id, updateTaskDto.columnId, task.position, _tenantId);
      // Reload task to get updated position
      const updatedTask = await this.tasksRepository.findOne({
        where: { id, status: TaskStatus.ACTIVE } as any,
      });
      return updatedTask!;
    }

    return this.tasksRepository.save(task);
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
    _tenantId: string,
  ): Promise<TaskEntity> {
    // Verify both columns belong to same board and tenant
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, status: TaskStatus.ACTIVE } as any,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
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

    return this.tasksRepository.save(task);
  }

  findByColumn(columnId: string): Promise<TaskEntity[]> {
    return this.tasksRepository.findByColumn(columnId);
  }
}
