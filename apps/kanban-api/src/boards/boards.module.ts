import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoardEntity } from "./entities/board.entity";
import { BoardsService } from "./boards.service";
import { BoardsController } from "./boards.controller";
import { BoardsRepository } from "./repositories/boards.repository";

@Module({
  imports: [TypeOrmModule.forFeature([BoardEntity])],
  controllers: [BoardsController],
  providers: [BoardsService, BoardsRepository],
  exports: [BoardsService, BoardsRepository],
})
export class BoardsModule {}
