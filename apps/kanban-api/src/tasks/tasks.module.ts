import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TasksService } from "./tasks.service";
import { TasksRepository } from "./repositories/tasks.repository";
import { TasksController } from "./tasks.controller";
import { TaskEntity } from "./entities/task.entity";
import { TaskCommentEntity } from "./entities/task-comment.entity";
import { TaskActivityEntity } from "./entities/task-activity.entity";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { BoardsRepository } from "../boards/repositories/boards.repository";
import { ColumnEntity } from "../columns/entities/column.entity";
import { BoardEntity } from "../boards/entities/board.entity";
import { TaskCommentsService } from "./task-comments.service";
import { TaskCommentsRepository } from "./repositories/task-comments.repository";
import { TaskCommentsController } from "./task-comments.controller";
import { TaskActivityService } from "./task-activity.service";
import { TaskActivityRepository } from "./repositories/task-activity.repository";
import { WebsocketModule } from "../websocket/websocket.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      TaskCommentEntity,
      TaskActivityEntity,
      ColumnEntity,
      BoardEntity,
    ]),
    WebsocketModule,
  ],
  controllers: [TasksController, TaskCommentsController],
  providers: [
    TasksService,
    TasksRepository,
    TaskCommentsService,
    TaskCommentsRepository,
    TaskActivityService,
    TaskActivityRepository,
    ColumnsRepository,
    BoardsRepository,
  ],
  exports: [
    TasksService,
    TasksRepository,
    TaskCommentsService,
    TaskActivityService,
  ],
})
export class TasksModule {}
