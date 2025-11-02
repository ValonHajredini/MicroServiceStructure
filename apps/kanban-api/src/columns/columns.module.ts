import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ColumnEntity } from "./entities/column.entity";
import { ColumnsService } from "./columns.service";
import { ColumnsRepository } from "./repositories/columns.repository";
import { ColumnsController } from "./columns.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ColumnEntity])],
  controllers: [ColumnsController],
  providers: [ColumnsService, ColumnsRepository],
  exports: [ColumnsService, ColumnsRepository],
})
export class ColumnsModule {}
