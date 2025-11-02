import { Inject, Injectable, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { REQUEST } from "@nestjs/core";
import { Repository } from "typeorm";
import { BaseTenantRepository } from "../../common/repositories/base-tenant.repository";
import { TaskEntity } from "../entities/task.entity";

@Injectable({ scope: Scope.REQUEST })
export class TasksRepository extends BaseTenantRepository<TaskEntity> {
  constructor(
    @InjectRepository(TaskEntity) repository: Repository<TaskEntity>,
    @Inject(REQUEST) request: any,
  ) {
    super(repository, request);
  }

  findByColumn(columnId: string) {
    return this.find({
      where: { column_id: columnId } as any,
      order: { position: "ASC" },
    });
  }
}
