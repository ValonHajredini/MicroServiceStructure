import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { ColumnsService } from "./columns.service";
import { CreateColumnDto } from "./dto/create-column.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { ReorderColumnsDto } from "./dto/reorder-columns.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("columns")
@ApiBearerAuth("JWT-auth")
@Controller("api/v1")
@UseGuards(RolesGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post("boards/:boardId/columns")
  @ApiOperation({
    summary: "Create a new column",
    description:
      "Creates a new column in a board. Columns are used to organize tasks in different workflow stages.",
  })
  @ApiParam({ name: "boardId", description: "Board ID where column will be created" })
  @ApiResponse({ status: 201, description: "Column successfully created" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Board not found" })
  async create(
    @Param("boardId") boardId: string,
    @Body() createColumnDto: CreateColumnDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.columnsService.create(boardId, createColumnDto, tenantId);
  }

  @Patch("columns/:id")
  @ApiOperation({
    summary: "Update a column",
    description:
      "Updates column properties such as name or task limit.",
  })
  @ApiParam({ name: "id", description: "Column ID" })
  @ApiResponse({ status: 200, description: "Column successfully updated" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Column not found" })
  async update(
    @Param("id") id: string,
    @Body() updateColumnDto: UpdateColumnDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.columnsService.update(id, updateColumnDto, tenantId);
  }

  @Delete("columns/:id")
  @ApiOperation({
    summary: "Delete a column",
    description:
      "Permanently deletes a column and all its tasks. Use with caution.",
  })
  @ApiParam({ name: "id", description: "Column ID" })
  @ApiResponse({ status: 200, description: "Column successfully deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Column not found" })
  async remove(@Param("id") id: string, @CurrentTenant() tenantId: string) {
    await this.columnsService.remove(id, tenantId);
    return { success: true, message: "Column deleted successfully" };
  }

  @Patch("boards/:boardId/columns/reorder")
  @ApiOperation({
    summary: "Reorder columns",
    description:
      "Updates the display order of columns in a board. Used for drag-and-drop column reordering.",
  })
  @ApiParam({ name: "boardId", description: "Board ID" })
  @ApiResponse({ status: 200, description: "Columns successfully reordered" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Board not found" })
  async reorderColumns(
    @Param("boardId") boardId: string,
    @Body() reorderDto: ReorderColumnsDto,
    @CurrentTenant() tenantId: string,
  ) {
    await this.columnsService.reorderColumns(
      boardId,
      reorderDto.columnIds,
      tenantId,
    );
    return { success: true, message: "Columns reordered successfully" };
  }
}
