import { Inject, Injectable, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { REQUEST } from "@nestjs/core";
import { Repository } from "typeorm";
import { BaseTenantRepository } from "../../common/repositories/base-tenant.repository";
import { ColumnEntity } from "../entities/column.entity";

@Injectable({ scope: Scope.REQUEST })
export class ColumnsRepository extends BaseTenantRepository<ColumnEntity> {
  constructor(
    @InjectRepository(ColumnEntity) repository: Repository<ColumnEntity>,
    @Inject(REQUEST) request: any,
  ) {
    super(repository, request);
  }

  findByBoard(boardId: string) {
    return this.find({
      where: { board_id: boardId } as any,
      order: { position: "ASC" },
    });
  }
}
