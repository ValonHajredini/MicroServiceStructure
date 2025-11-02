import { Injectable } from "@nestjs/common";
import { ColumnsRepository } from "./repositories/columns.repository";
import { ColumnEntity } from "./entities/column.entity";
import { CreateColumnDto } from "./dto/create-column.dto";

@Injectable()
export class ColumnsService {
  constructor(private readonly columnsRepository: ColumnsRepository) {}

  findByBoard(boardId: string): Promise<ColumnEntity[]> {
    return this.columnsRepository.findByBoard(boardId);
  }

  async create(dto: CreateColumnDto): Promise<ColumnEntity> {
    return this.columnsRepository.save({
      board_id: dto.boardId,
      title: dto.title,
      position: dto.position,
      wip_limit: dto.wipLimit ?? null,
    });
  }
}
