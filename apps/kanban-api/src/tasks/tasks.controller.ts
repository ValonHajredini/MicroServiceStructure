import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { CreateTaskDto } from "./dto/create-task.dto";

@Controller("boards/:boardId/columns/:columnId/tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findByColumn(@Param("columnId") columnId: string) {
    return this.tasksService.findByColumn(columnId);
  }

  @Post()
  create(
    @Param("boardId") boardId: string,
    @Param("columnId") columnId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create({
      ...dto,
      boardId,
      columnId,
    });
  }
}
