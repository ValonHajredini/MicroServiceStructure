import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoardEntity } from "./entities/board.entity";
import { BoardsService } from "./boards.service";
import { BoardsUpdatesService } from "./boards-updates.service";
import { BoardsController } from "./boards.controller";
import { BoardsRepository } from "./repositories/boards.repository";
import { ColumnEntity } from "../columns/entities/column.entity";
import { TaskEntity } from "../tasks/entities/task.entity";
import { TaskCommentEntity } from "../tasks/entities/task-comment.entity";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { TasksRepository } from "../tasks/repositories/tasks.repository";
import { TaskCommentsRepository } from "../tasks/repositories/task-comments.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BoardEntity,
      ColumnEntity,
      TaskEntity,
      TaskCommentEntity,
    ]),
  ],
  controllers: [BoardsController],
  providers: [
    BoardsService,
    BoardsUpdatesService,
    BoardsRepository,
    ColumnsRepository,
    TasksRepository,
    TaskCommentsRepository,
  ],
  exports: [BoardsService, BoardsRepository],
})
export class BoardsModule {}
