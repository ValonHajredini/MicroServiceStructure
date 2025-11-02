import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { CreateBoardDto } from "./dto/create-board.dto";
import { UpdateBoardDto } from "./dto/update-board.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@Controller("api/v1/boards")
@UseGuards(RolesGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  async create(
    @Body() createBoardDto: CreateBoardDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const board = await this.boardsService.create(
      createBoardDto,
      tenantId,
      user.userId,
    );
    return board;
  }

  @Get()
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const result = await this.boardsService.findAll(
      tenantId,
      pageNum,
      limitNum,
    );
    return {
      data: result.data,
      total: result.total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentTenant() tenantId: string) {
    const board = await this.boardsService.findOne(id, tenantId);
    return board;
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateBoardDto: UpdateBoardDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const board = await this.boardsService.update(
      id,
      updateBoardDto,
      tenantId,
      user.userId,
      user.roles || [],
    );
    return board;
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    await this.boardsService.remove(
      id,
      tenantId,
      user.userId,
      user.roles || [],
    );
    return { success: true, message: "Board deleted successfully" };
  }
}
