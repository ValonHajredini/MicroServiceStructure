import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TaskCommentsRepository } from "./repositories/task-comments.repository";
import { TasksRepository } from "./repositories/tasks.repository";
import {
  TaskCommentEntity,
  CommentStatus,
} from "./entities/task-comment.entity";
import { TaskEntity, TaskStatus } from "./entities/task.entity";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { KanbanGateway } from "../websocket/kanban.gateway";

@Injectable()
export class TaskCommentsService {
  constructor(
    private readonly commentsRepository: TaskCommentsRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly kanbanGateway: KanbanGateway,
  ) {}

  async create(
    taskId: string,
    createCommentDto: CreateCommentDto,
    tenantId: string,
    userId: string,
  ): Promise<TaskCommentEntity> {
    // Verify task exists and belongs to tenant
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, status: TaskStatus.ACTIVE } as any,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Create comment with tenant_id, task_id, user_id
    const comment = await this.commentsRepository.save({
      task_id: taskId,
      content: createCommentDto.content,
      user_id: userId,
      status: CommentStatus.ACTIVE,
    });

    // Emit WebSocket event: comment added
    this.kanbanGateway.emitCommentAdded(
      task.board_id,
      tenantId,
      taskId,
      comment,
    );

    return comment;
  }

  async findAllByTask(
    taskId: string,
    _tenantId: string,
  ): Promise<TaskCommentEntity[]> {
    // Verify task exists and belongs to tenant
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, status: TaskStatus.ACTIVE } as any,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Find all active comments for task, ordered by created_at ASC
    return this.commentsRepository.find({
      where: {
        task_id: taskId,
        status: CommentStatus.ACTIVE,
      } as any,
      order: { created_at: "ASC" },
    });
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    _tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<TaskCommentEntity> {
    const comment = await this.commentsRepository.findOne({
      where: { id, status: CommentStatus.ACTIVE } as any,
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Check authorization: comment author or admin
    const isAuthor = comment.user_id === userId;
    const isAdmin = userRoles.includes("admin");

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        "You do not have permission to update this comment",
      );
    }

    // Update comment content
    comment.content = updateCommentDto.content;
    return this.commentsRepository.save(comment);
  }

  async remove(
    id: string,
    _tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id, status: CommentStatus.ACTIVE } as any,
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Check authorization: comment author or admin
    const isAuthor = comment.user_id === userId;
    const isAdmin = userRoles.includes("admin");

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        "You do not have permission to delete this comment",
      );
    }

    // Soft delete comment (set status = 'deleted')
    comment.status = CommentStatus.DELETED;
    await this.commentsRepository.save(comment);
  }
}
