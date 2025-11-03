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
import { TaskCommentsService } from "./task-comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("comments")
@ApiBearerAuth("JWT-auth")
@Controller("api/v1")
@UseGuards(RolesGuard)
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @Post("tasks/:taskId/comments")
  @ApiOperation({
    summary: "Create a task comment",
    description:
      "Adds a new comment to a task. The authenticated user becomes the comment author.",
  })
  @ApiParam({ name: "taskId", description: "Task ID to add comment to" })
  @ApiResponse({ status: 201, description: "Comment successfully created" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async create(
    @Param("taskId") taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.commentsService.create(
      taskId,
      createCommentDto,
      tenantId,
      user.userId,
    );
  }

  @Get("tasks/:id/comments")
  @ApiOperation({
    summary: "Get all task comments",
    description:
      "Retrieves all comments for a specific task, ordered by creation date.",
  })
  @ApiParam({ name: "id", description: "Task ID" })
  @ApiResponse({ status: 200, description: "List of task comments" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Task not found" })
  async findAllByTask(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.commentsService.findAllByTask(id, tenantId);
  }

  @Patch("comments/:id")
  @ApiOperation({
    summary: "Update a comment",
    description:
      "Updates comment content. Only the comment author or admins can update.",
  })
  @ApiParam({ name: "id", description: "Comment ID" })
  @ApiResponse({ status: 200, description: "Comment successfully updated" })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - only author or admin can update",
  })
  @ApiResponse({ status: 404, description: "Comment not found" })
  async update(
    @Param("id") id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.commentsService.update(
      id,
      updateCommentDto,
      tenantId,
      user.userId,
      user.roles || [],
    );
  }

  @Delete("comments/:id")
  @ApiOperation({
    summary: "Delete a comment",
    description:
      "Permanently deletes a comment. Only the comment author or admins can delete.",
  })
  @ApiParam({ name: "id", description: "Comment ID" })
  @ApiResponse({ status: 200, description: "Comment successfully deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - only author or admin can delete",
  })
  @ApiResponse({ status: 404, description: "Comment not found" })
  async remove(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    await this.commentsService.remove(
      id,
      tenantId,
      user.userId,
      user.roles || [],
    );
    return { success: true, message: "Comment deleted successfully" };
  }
}
