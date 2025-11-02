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
import { TaskCommentsService } from "./task-comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { CurrentTenant } from "../common/decorators/current-tenant.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@Controller("api/v1")
@UseGuards(RolesGuard)
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @Post("tasks/:taskId/comments")
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
  async findAllByTask(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.commentsService.findAllByTask(id, tenantId);
  }

  @Patch("comments/:id")
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
