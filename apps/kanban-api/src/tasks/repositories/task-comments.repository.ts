import { Inject, Injectable, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { REQUEST } from "@nestjs/core";
import { Repository } from "typeorm";
import { BaseTenantRepository } from "../../common/repositories/base-tenant.repository";
import { TaskCommentEntity } from "../entities/task-comment.entity";

@Injectable({ scope: Scope.REQUEST })
export class TaskCommentsRepository extends BaseTenantRepository<TaskCommentEntity> {
  constructor(
    @InjectRepository(TaskCommentEntity)
    repository: Repository<TaskCommentEntity>,
    @Inject(REQUEST) request: any,
  ) {
    super(repository, request);
  }

  findByTask(taskId: string) {
    return this.find({
      where: { task_id: taskId } as any,
      order: { created_at: "ASC" },
    });
  }
}
