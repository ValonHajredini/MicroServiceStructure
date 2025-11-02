import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@Controller("api/v1")
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post("columns/:columnId/tasks")
  async create(
    @Param("columnId") columnId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.tasksService.create(columnId, createTaskDto, tenantId);
  }

  @Get("tasks/:id")
  async findOne(@Param("id") id: string, @CurrentTenant() tenantId: string) {
    return this.tasksService.findOne(id, tenantId);
  }

  @Patch("tasks/:id")
  async update(
    @Param("id") id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.tasksService.update(
      id,
      updateTaskDto,
      tenantId,
      user.userId,
      user.roles || [],
    );
  }

  @Delete("tasks/:id")
  async remove(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    await this.tasksService.remove(id, tenantId, user.userId, user.roles || []);
    return { success: true, message: "Task deleted successfully" };
  }

  @Patch("tasks/:id/move")
  async moveTask(
    @Param("id") id: string,
    @Body() body: { columnId: string; position: number },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.tasksService.moveTask(
      id,
      body.columnId,
      body.position,
      tenantId,
      user.userId,
      user.roles || [],
    );
  }
}
