import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { CreateBoardDto } from "./dto/create-board.dto";

@Controller("boards")
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  findAll() {
    return this.boardsService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateBoardDto, @Req() req: any) {
    const ownerId = req.user?.userId ?? req.user?.sub;
    return this.boardsService.create({
      name: dto.name,
      description: dto.description,
      ownerId,
    });
  }
}
