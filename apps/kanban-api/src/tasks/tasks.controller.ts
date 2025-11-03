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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TaskActivityService } from "./task-activity.service";

@ApiTags("tasks")
@ApiBearerAuth("JWT-auth")
@Controller("api/v1")
@UseGuards(RolesGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly activityService: TaskActivityService,
  ) {}

  @Post("columns/:columnId/tasks")
  @ApiOperation({
    summary: "Create a new task",
    description:
      "Creates a new task in a specific column. The task will be positioned at the end of the column.",
  })
  @ApiParam({ name: "columnId", description: "Column ID where task will be created" })
  @ApiResponse({ status: 201, description: "Task successfully created" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Column not found" })
  async create(
    @Param("columnId") columnId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user?: { userId: string },
  ) {
    return this.tasksService.create(
      columnId,
      createTaskDto,
      tenantId,
      user?.userId,
    );
  }

  @Get("tasks/:id")
  @ApiOperation({
    summary: "Get a single task",
    description: "Retrieves detailed information about a specific task.",
  })
  @ApiParam({ name: "id", description: "Task ID" })
  @ApiResponse({ status: 200, description: "Task details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async findOne(@Param("id") id: string, @CurrentTenant() tenantId: string) {
    return this.tasksService.findOne(id, tenantId);
  }

  @Patch("tasks/:id")
  @ApiOperation({
    summary: "Update a task",
    description:
      "Updates task properties such as title, description, due date, or assigned users.",
  })
  @ApiParam({ name: "id", description: "Task ID" })
  @ApiResponse({ status: 200, description: "Task successfully updated" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
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
  @ApiOperation({
    summary: "Delete a task",
    description: "Permanently deletes a task and all its comments and activity.",
  })
  @ApiParam({ name: "id", description: "Task ID" })
  @ApiResponse({ status: 200, description: "Task successfully deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async remove(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    await this.tasksService.remove(id, tenantId, user.userId, user.roles || []);
    return { success: true, message: "Task deleted successfully" };
  }

  @Patch("tasks/:id/move")
  @ApiOperation({
    summary: "Move task to different column",
    description:
      "Moves a task to a different column and/or position. Used for drag-and-drop functionality.",
  })
  @ApiParam({ name: "id", description: "Task ID" })
  @ApiResponse({ status: 200, description: "Task successfully moved" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task or column not found" })
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

  @Get("tasks/:id/activity")
  @ApiOperation({
    summary: "Get task activity log",
    description:
      "Retrieves the complete activity history for a task (creation, updates, moves, assignments, etc.).",
  })
  @ApiParam({ name: "id", description: "Task ID" })
  @ApiResponse({ status: 200, description: "List of task activities" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async getActivity(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const activities = await this.activityService.findAllByTask(id, tenantId);
    return {
      success: true,
      data: activities,
    };
  }
}
