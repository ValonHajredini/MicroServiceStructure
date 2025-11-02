import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TasksService } from "./tasks.service";
import { TasksRepository } from "./repositories/tasks.repository";
import { TasksController } from "./tasks.controller";
import { TaskEntity } from "./entities/task.entity";
import { TaskCommentEntity } from "./entities/task-comment.entity";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { BoardsRepository } from "../boards/repositories/boards.repository";
import { ColumnEntity } from "../columns/entities/column.entity";
import { BoardEntity } from "../boards/entities/board.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      TaskCommentEntity,
      ColumnEntity,
      BoardEntity,
    ]),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TasksRepository,
    ColumnsRepository,
    BoardsRepository,
  ],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
