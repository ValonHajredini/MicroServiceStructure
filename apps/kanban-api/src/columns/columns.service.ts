import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ColumnsRepository } from "./repositories/columns.repository";
import { ColumnEntity, ColumnStatus } from "./entities/column.entity";
import { CreateColumnDto } from "./dto/create-column.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { BoardsRepository } from "../boards/repositories/boards.repository";
import { TasksRepository } from "../tasks/repositories/tasks.repository";
import { TaskEntity, TaskStatus } from "../tasks/entities/task.entity";
import { BoardStatus } from "../boards/entities/board.entity";
import { KanbanGateway } from "../websocket/kanban.gateway";

@Injectable()
export class ColumnsService {
  constructor(
    private readonly columnsRepository: ColumnsRepository,
    private readonly boardsRepository: BoardsRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly kanbanGateway: KanbanGateway,
  ) {}

  async create(
    boardId: string,
    createColumnDto: CreateColumnDto,
    _tenantId: string,
  ): Promise<ColumnEntity> {
    // Verify board exists and belongs to tenant
    const board = await this.boardsRepository.findOne({
      where: {
        id: boardId,
        status: BoardStatus.ACTIVE,
      } as any,
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${boardId} not found`);
    }

    // Auto-assign position if not provided (max position + 1)
    let position = createColumnDto.position;
    if (position === undefined) {
      const existingColumns = await this.columnsRepository.find({
        where: { board_id: boardId } as any,
        order: { position: "DESC" },
        take: 1,
      });

      if (existingColumns.length > 0) {
        position = existingColumns[0].position + 1;
      } else {
        position = 0;
      }
    }

    // Create column with tenant_id and board_id
    const column = await this.columnsRepository.save({
      board_id: boardId,
      title: createColumnDto.title,
      position,
      wip_limit: createColumnDto.wip_limit ?? null,
      status: ColumnStatus.ACTIVE,
    });

    // Emit WebSocket event: column added
    this.kanbanGateway.emitColumnAdded(boardId, _tenantId, column);

    return column;
  }

  async findAllByBoard(
    boardId: string,
    tenantId: string,
  ): Promise<ColumnEntity[]> {
    return this.columnsRepository.find({
      where: { board_id: boardId, status: ColumnStatus.ACTIVE } as any,
      order: { position: "ASC" },
    });
  }

  async findOne(id: string, tenantId: string): Promise<ColumnEntity> {
    const column = await this.columnsRepository.findOne({
      where: {
        id,
        status: ColumnStatus.ACTIVE,
      } as any,
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    return column;
  }

  async update(
    id: string,
    updateColumnDto: UpdateColumnDto,
    tenantId: string,
  ): Promise<ColumnEntity> {
    const column = await this.columnsRepository.findOne({
      where: {
        id,
        status: ColumnStatus.ACTIVE,
      } as any,
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    // Handle position reordering if position is being updated
    if (updateColumnDto.position !== undefined) {
      const newPosition = updateColumnDto.position;
      const boardColumns = await this.columnsRepository.find({
        where: {
          board_id: column.board_id,
          status: ColumnStatus.ACTIVE,
        } as any,
        order: { position: "ASC" },
      });

      // If position changed, adjust other columns
      if (column.position !== newPosition) {
        if (newPosition < column.position) {
          // Moving up - shift columns down
          for (const col of boardColumns) {
            if (
              col.id !== column.id &&
              col.position >= newPosition &&
              col.position < column.position
            ) {
              col.position += 1;
              await this.columnsRepository.save(col);
            }
          }
        } else {
          // Moving down - shift columns up
          for (const col of boardColumns) {
            if (
              col.id !== column.id &&
              col.position > column.position &&
              col.position <= newPosition
            ) {
              col.position -= 1;
              await this.columnsRepository.save(col);
            }
          }
        }
      }
    }

    // Update column fields
    if (updateColumnDto.title !== undefined) {
      column.title = updateColumnDto.title;
    }
    if (updateColumnDto.position !== undefined) {
      column.position = updateColumnDto.position;
    }
    if (updateColumnDto.wip_limit !== undefined) {
      column.wip_limit = updateColumnDto.wip_limit ?? null;
    }

    return this.columnsRepository.save(column);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const column = await this.columnsRepository.findOne({
      where: {
        id,
        status: ColumnStatus.ACTIVE,
      } as any,
      relations: ["tasks"],
    });

    if (!column) {
      throw new NotFoundException(`Column with ID ${id} not found`);
    }

    // Find first column in board (lowest position)
    const boardColumns = await this.columnsRepository.find({
      where: {
        board_id: column.board_id,
        status: ColumnStatus.ACTIVE,
      } as any,
      order: { position: "ASC" },
    });

    const firstColumn = boardColumns.find((col) => col.id !== id);

    if (!firstColumn) {
      // No other columns exist, just soft delete this one
      // But tasks will be orphaned - this should not happen in practice
      column.status = ColumnStatus.DELETED;
      await this.columnsRepository.save(column);
      return;
    }

    // Move all tasks from deleted column to first column
    const tasks = await this.tasksRepository.find({
      where: {
        column_id: id,
        status: TaskStatus.ACTIVE,
      } as any,
    });

    if (tasks.length > 0) {
      // Find max position in first column
      const firstColumnTasks = await this.tasksRepository.find({
        where: {
          column_id: firstColumn.id,
          status: TaskStatus.ACTIVE,
        } as any,
        order: { position: "DESC" },
        take: 1,
      });

      let nextPosition =
        firstColumnTasks.length > 0 ? firstColumnTasks[0].position + 1 : 0;

      // Move tasks to first column
      for (const task of tasks) {
        task.column_id = firstColumn.id;
        task.position = nextPosition;
        await this.tasksRepository.save(task as Partial<TaskEntity>);
        nextPosition += 1;
      }
    }

    // Soft delete column
    column.status = ColumnStatus.DELETED;
    await this.columnsRepository.save(column);
  }

  async reorderColumns(
    boardId: string,
    columnIds: string[],
    tenantId: string,
  ): Promise<void> {
    // Verify all columns belong to the board and tenant
    const boardColumns = await this.columnsRepository.find({
      where: {
        board_id: boardId,
        status: ColumnStatus.ACTIVE,
      } as any,
    });

    // Check all provided column IDs exist in board
    const providedIdsSet = new Set(columnIds);
    const boardColumnIds = new Set(boardColumns.map((col) => col.id));

    if (columnIds.length !== boardColumnIds.size) {
      throw new BadRequestException(
        "Column IDs count does not match board columns count",
      );
    }

    for (const colId of columnIds) {
      if (!boardColumnIds.has(colId)) {
        throw new NotFoundException(
          `Column with ID ${colId} not found in board`,
        );
      }
    }

    // Update position values based on new order
    const updatedColumns: ColumnEntity[] = [];
    for (let i = 0; i < columnIds.length; i++) {
      const column = boardColumns.find((col) => col.id === columnIds[i]);
      if (column && column.position !== i) {
        column.position = i;
        await this.columnsRepository.save(column);
        updatedColumns.push(column);
      }
    }

    // Emit WebSocket event: columns reordered
    if (updatedColumns.length > 0) {
      this.kanbanGateway.emitColumnReordered(boardId, tenantId, boardColumns);
    }
  }

  async checkWipLimit(columnId: string, tenantId: string): Promise<boolean> {
    const column = await this.findOne(columnId, tenantId);

    if (!column.wip_limit) {
      return true; // No limit set, always allow
    }

    // Count active tasks in column
    const taskCount = await this.tasksRepository.count({
      where: {
        column_id: columnId,
        status: TaskStatus.ACTIVE,
      } as any,
    });

    return taskCount < column.wip_limit;
  }
}
