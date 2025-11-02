import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TasksService } from "./tasks.service";
import { TasksRepository } from "./repositories/tasks.repository";
import { TasksController } from "./tasks.controller";
import { TaskEntity } from "./entities/task.entity";
import { TaskCommentEntity } from "./entities/task-comment.entity";

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, TaskCommentEntity])],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
