import { Injectable } from "@nestjs/common";
import { BoardsRepository } from "./repositories/boards.repository";
import { BoardEntity, BoardStatus } from "./entities/board.entity";

interface CreateBoardInput {
  name: string;
  description?: string | null;
  ownerId: string;
}

@Injectable()
export class BoardsService {
  constructor(private readonly boardsRepository: BoardsRepository) {}

  findAll(): Promise<BoardEntity[]> {
    return this.boardsRepository.find({
      where: { status: BoardStatus.ACTIVE },
    });
  }

  findById(id: string): Promise<BoardEntity | null> {
    return this.boardsRepository.findById(id);
  }

  async create(input: CreateBoardInput): Promise<BoardEntity> {
    return this.boardsRepository.save({
      name: input.name,
      description: input.description ?? null,
      owner_id: input.ownerId,
      status: BoardStatus.ACTIVE,
    });
  }
}
