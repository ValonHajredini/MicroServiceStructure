import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ColumnEntity } from "./entities/column.entity";
import { ColumnsService } from "./columns.service";
import { ColumnsRepository } from "./repositories/columns.repository";
import { ColumnsController } from "./columns.controller";
import { BoardsRepository } from "../boards/repositories/boards.repository";
import { TasksRepository } from "../tasks/repositories/tasks.repository";
import { BoardEntity } from "../boards/entities/board.entity";
import { TaskEntity } from "../tasks/entities/task.entity";
import { WebsocketModule } from "../websocket/websocket.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ColumnEntity, BoardEntity, TaskEntity]),
    WebsocketModule,
  ],
  controllers: [ColumnsController],
  providers: [
    ColumnsService,
    ColumnsRepository,
    BoardsRepository,
    TasksRepository,
  ],
  exports: [ColumnsService, ColumnsRepository],
})
export class ColumnsModule {}
