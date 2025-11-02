import { Inject, Injectable, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { REQUEST } from "@nestjs/core";
import { Repository } from "typeorm";
import { BaseTenantRepository } from "../../common/repositories/base-tenant.repository";
import { TaskActivityEntity } from "../entities/task-activity.entity";

@Injectable({ scope: Scope.REQUEST })
export class TaskActivityRepository extends BaseTenantRepository<TaskActivityEntity> {
  constructor(
    @InjectRepository(TaskActivityEntity)
    repository: Repository<TaskActivityEntity>,
    @Inject(REQUEST) request: any,
  ) {
    super(repository, request);
  }

  findByTask(taskId: string) {
    return this.find({
      where: { task_id: taskId } as any,
      order: { created_at: "DESC" },
    });
  }
}
