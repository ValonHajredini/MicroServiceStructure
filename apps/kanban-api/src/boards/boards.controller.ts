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
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { BoardsService } from "./boards.service";
import { BoardsUpdatesService } from "./boards-updates.service";
import { CreateBoardDto } from "./dto/create-board.dto";
import { UpdateBoardDto } from "./dto/update-board.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("boards")
@ApiBearerAuth("JWT-auth")
@Controller("api/v1/boards")
@UseGuards(RolesGuard)
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly boardsUpdatesService: BoardsUpdatesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Create a new board",
    description:
      "Creates a new Kanban board in the current tenant. The authenticated user becomes the board creator.",
  })
  @ApiResponse({
    status: 201,
    description: "Board successfully created",
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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
  @ApiOperation({
    summary: "Get all boards",
    description:
      "Retrieves a paginated list of all boards for the current tenant.",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20)",
  })
  @ApiResponse({
    status: 200,
    description: "List of boards with pagination metadata",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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
  @ApiOperation({
    summary: "Get a single board",
    description:
      "Retrieves detailed information about a specific board including all its columns and tasks.",
  })
  @ApiParam({ name: "id", description: "Board ID" })
  @ApiResponse({ status: 200, description: "Board details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Board not found" })
  async findOne(@Param("id") id: string, @CurrentTenant() tenantId: string) {
    const board = await this.boardsService.findOne(id, tenantId);
    return board;
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a board",
    description:
      "Updates board properties such as name, description, or settings. Only board creator or admins can update.",
  })
  @ApiParam({ name: "id", description: "Board ID" })
  @ApiResponse({ status: 200, description: "Board successfully updated" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Board not found" })
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
  @ApiOperation({
    summary: "Delete a board",
    description:
      "Permanently deletes a board and all its columns and tasks. Only board creator or admins can delete.",
  })
  @ApiParam({ name: "id", description: "Board ID" })
  @ApiResponse({
    status: 200,
    description: "Board successfully deleted",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Board not found" })
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

  @Get(":id/updates")
  @ApiOperation({
    summary: "Get board updates",
    description:
      "Retrieves all changes (columns, tasks) made to a board since a specific timestamp. Used for real-time synchronization.",
  })
  @ApiParam({ name: "id", description: "Board ID" })
  @ApiQuery({
    name: "since",
    description: "ISO timestamp to get updates from",
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "List of updates since the specified timestamp",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or missing 'since' parameter",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Board not found" })
  async getUpdates(
    @Param("id") boardId: string,
    @Query("since") since: string,
    @CurrentTenant() tenantId: string,
  ) {
    if (!since) {
      throw new BadRequestException("'since' query parameter is required");
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      throw new BadRequestException("'since' must be a valid ISO timestamp");
    }

    // Verify user has access to this board before returning updates
    await this.boardsService.findOne(boardId, tenantId);

    const updates = await this.boardsUpdatesService.getUpdatesSince(
      boardId,
      sinceDate,
      tenantId,
    );

    return {
      success: true,
      data: updates,
    };
  }
}
