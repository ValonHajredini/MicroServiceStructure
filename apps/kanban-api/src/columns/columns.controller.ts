import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ColumnsService } from "./columns.service";
import { CreateColumnDto } from "./dto/create-column.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { ReorderColumnsDto } from "./dto/reorder-columns.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@Controller("api/v1")
@UseGuards(RolesGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post("boards/:boardId/columns")
  async create(
    @Param("boardId") boardId: string,
    @Body() createColumnDto: CreateColumnDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.columnsService.create(boardId, createColumnDto, tenantId);
  }

  @Patch("columns/:id")
  async update(
    @Param("id") id: string,
    @Body() updateColumnDto: UpdateColumnDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.columnsService.update(id, updateColumnDto, tenantId);
  }

  @Delete("columns/:id")
  async remove(@Param("id") id: string, @CurrentTenant() tenantId: string) {
    await this.columnsService.remove(id, tenantId);
    return { success: true, message: "Column deleted successfully" };
  }

  @Patch("boards/:boardId/columns/reorder")
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
