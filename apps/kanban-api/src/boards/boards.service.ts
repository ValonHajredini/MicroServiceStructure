import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BoardsRepository } from "./repositories/boards.repository";
import { BoardEntity, BoardStatus } from "./entities/board.entity";
import { CreateBoardDto } from "./dto/create-board.dto";
import { UpdateBoardDto } from "./dto/update-board.dto";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { TasksRepository } from "../tasks/repositories/tasks.repository";
import { ColumnStatus } from "../columns/entities/column.entity";
import { TaskStatus } from "../tasks/entities/task.entity";

@Injectable()
export class BoardsService {
  constructor(
    private readonly boardsRepository: BoardsRepository,
    private readonly columnsRepository: ColumnsRepository,
    private readonly tasksRepository: TasksRepository,
  ) {}

  async create(
    createBoardDto: CreateBoardDto,
    tenantId: string,
    userId: string,
  ): Promise<BoardEntity> {
    const board = await this.boardsRepository.save({
      name: createBoardDto.name,
      description: createBoardDto.description ?? null,
      owner_id: userId,
      status: BoardStatus.ACTIVE,
    } as Partial<BoardEntity>);

    return board;
  }

  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: BoardEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    // Use query builder to access repository with tenant scoping
    const queryBuilder = this.boardsRepository.createQueryBuilder("board");
    queryBuilder.where("board.tenant_id = :tenantId", { tenantId });
    queryBuilder.andWhere("board.status = :status", {
      status: BoardStatus.ACTIVE,
    });
    queryBuilder.orderBy("board.created_at", "DESC");
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string, tenantId: string): Promise<BoardEntity> {
    const board = await this.boardsRepository.findOne({
      where: {
        id,
        tenant_id: tenantId,
        status: BoardStatus.ACTIVE,
      } as any,
      relations: ["columns", "columns.tasks", "columns.tasks.comments"],
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    // Sort columns by position if they exist
    if (board.columns) {
      board.columns = board.columns
        .filter((col) => col.status === ColumnStatus.ACTIVE)
        .sort((a, b) => a.position - b.position);
    }

    return board;
  }

  async update(
    id: string,
    updateBoardDto: UpdateBoardDto,
    tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<BoardEntity> {
    const board = await this.boardsRepository.findOne({
      where: { id, status: BoardStatus.ACTIVE } as any,
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    // Check authorization: owner or admin
    const isOwner = board.owner_id === userId;
    const isAdmin = userRoles.includes("admin");

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        "You do not have permission to update this board",
      );
    }

    // Update fields
    if (updateBoardDto.name !== undefined) {
      board.name = updateBoardDto.name;
    }
    if (updateBoardDto.description !== undefined) {
      board.description = updateBoardDto.description ?? null;
    }

    return this.boardsRepository.save(board as Partial<BoardEntity>);
  }

  async remove(
    id: string,
    tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<void> {
    const board = await this.boardsRepository.findOne({
      where: { id, status: BoardStatus.ACTIVE } as any,
      relations: ["columns", "columns.tasks"],
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    // Check authorization: owner or admin
    const isOwner = board.owner_id === userId;
    const isAdmin = userRoles.includes("admin");

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        "You do not have permission to delete this board",
      );
    }

    // Soft delete board and cascade to columns and tasks
    // First, soft delete all tasks in all columns
    if (board.columns && board.columns.length > 0) {
      for (const column of board.columns) {
        if (column.tasks && column.tasks.length > 0) {
          for (const task of column.tasks) {
            task.status = TaskStatus.DELETED;
            await this.tasksRepository.save(task as any);
          }
        }
        // Then soft delete the column
        column.status = ColumnStatus.DELETED;
        await this.columnsRepository.save(column as any);
      }
    }

    // Finally, soft delete the board
    board.status = BoardStatus.DELETED;
    await this.boardsRepository.save(board as Partial<BoardEntity>);
  }
}
