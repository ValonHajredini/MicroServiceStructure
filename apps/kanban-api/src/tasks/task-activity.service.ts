import { Injectable } from "@nestjs/common";
import { TaskActivityRepository } from "./repositories/task-activity.repository";
import {
  TaskActivityEntity,
  TaskActionType,
} from "./entities/task-activity.entity";

@Injectable()
export class TaskActivityService {
  constructor(private readonly activityRepository: TaskActivityRepository) {}

  async logActivity(
    taskId: string,
    actionType: TaskActionType,
    userId: string,
    tenantId: string,
    oldValue?: string,
    newValue?: string,
  ): Promise<TaskActivityEntity> {
    // Create activity record
    return this.activityRepository.save({
      task_id: taskId,
      user_id: userId,
      action_type: actionType,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
    });
  }

  async findAllByTask(
    taskId: string,
    _tenantId: string,
  ): Promise<TaskActivityEntity[]> {
    // Find all activities for task, ordered by created_at DESC
    return this.activityRepository.find({
      where: { task_id: taskId } as any,
      order: { created_at: "DESC" },
    });
  }
}
