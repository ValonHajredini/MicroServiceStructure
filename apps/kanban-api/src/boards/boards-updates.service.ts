import { Injectable } from "@nestjs/common";
import { TasksRepository } from "../tasks/repositories/tasks.repository";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { TaskCommentsRepository } from "../tasks/repositories/task-comments.repository";
import { TaskStatus } from "../tasks/entities/task.entity";
import { ColumnStatus } from "../columns/entities/column.entity";
import { CommentStatus } from "../tasks/entities/task-comment.entity";

export interface BoardUpdates {
  tasks: any[];
  columns: any[];
  comments: any[];
  timestamp: string;
}

@Injectable()
export class BoardsUpdatesService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly columnsRepository: ColumnsRepository,
    private readonly commentsRepository: TaskCommentsRepository,
  ) {}

  async getUpdatesSince(
    boardId: string,
    since: Date,
    tenantId: string,
  ): Promise<BoardUpdates> {
    // Query for tasks created or updated since timestamp
    const tasks = await this.tasksRepository
      .createQueryBuilder("task")
      .where("task.board_id = :boardId", { boardId })
      .andWhere("task.status = :status", { status: TaskStatus.ACTIVE })
      .andWhere("(task.created_at > :since OR task.updated_at > :since)", {
        since,
      })
      .orderBy("task.updated_at", "DESC")
      .getMany();

    // Query for columns created or updated since timestamp
    const columns = await this.columnsRepository
      .createQueryBuilder("column")
      .where("column.board_id = :boardId", { boardId })
      .andWhere("column.status = :status", { status: ColumnStatus.ACTIVE })
      .andWhere("(column.created_at > :since OR column.updated_at > :since)", {
        since,
      })
      .orderBy("column.position", "ASC")
      .getMany();

    // Query for comments created since timestamp (for tasks in this board)
    const comments = await this.commentsRepository
      .createQueryBuilder("comment")
      .innerJoin("comment.task", "task")
      .where("task.board_id = :boardId", { boardId })
      .andWhere("comment.status = :status", { status: CommentStatus.ACTIVE })
      .andWhere("comment.created_at > :since", { since })
      .orderBy("comment.created_at", "DESC")
      .select([
        "comment.id",
        "comment.task_id",
        "comment.content",
        "comment.user_id",
        "comment.created_at",
        "comment.updated_at",
      ])
      .getMany();

    return {
      tasks,
      columns,
      comments,
      timestamp: new Date().toISOString(),
    };
  }
}
