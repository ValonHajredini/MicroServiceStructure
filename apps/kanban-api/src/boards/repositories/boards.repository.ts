import { Inject, Injectable, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { REQUEST } from "@nestjs/core";
import { Repository } from "typeorm";
import { BaseTenantRepository } from "../../common/repositories/base-tenant.repository";
import { BoardEntity } from "../entities/board.entity";

@Injectable({ scope: Scope.REQUEST })
export class BoardsRepository extends BaseTenantRepository<BoardEntity> {
  constructor(
    @InjectRepository(BoardEntity) repository: Repository<BoardEntity>,
    @Inject(REQUEST) request: any,
  ) {
    super(repository, request);
  }
}
