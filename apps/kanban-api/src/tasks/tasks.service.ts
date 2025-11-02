import { Injectable } from "@nestjs/common";
import { TasksRepository } from "./repositories/tasks.repository";
import { TaskEntity, TaskPriority } from "./entities/task.entity";
import { CreateTaskDto } from "./dto/create-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  findByColumn(columnId: string): Promise<TaskEntity[]> {
    return this.tasksRepository.findByColumn(columnId);
  }

  async create(dto: CreateTaskDto): Promise<TaskEntity> {
    return this.tasksRepository.save({
      column_id: dto.columnId,
      board_id: dto.boardId,
      title: dto.title,
      description: dto.description ?? null,
      assigned_to: dto.assignedTo ?? null,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      due_date: dto.dueDate ? new Date(dto.dueDate) : null,
      position: dto.position,
    });
  }
}
