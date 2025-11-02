import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoardEntity } from "./entities/board.entity";
import { BoardsService } from "./boards.service";
import { BoardsController } from "./boards.controller";
import { BoardsRepository } from "./repositories/boards.repository";
import { ColumnEntity } from "../columns/entities/column.entity";
import { TaskEntity } from "../tasks/entities/task.entity";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { TasksRepository } from "../tasks/repositories/tasks.repository";

@Module({
  imports: [TypeOrmModule.forFeature([BoardEntity, ColumnEntity, TaskEntity])],
  controllers: [BoardsController],
  providers: [
    BoardsService,
    BoardsRepository,
    ColumnsRepository,
    TasksRepository,
  ],
  exports: [BoardsService, BoardsRepository],
})
export class BoardsModule {}
