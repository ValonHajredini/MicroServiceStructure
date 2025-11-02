import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { TaskCommentsService } from "./task-comments.service";
import { TaskCommentsRepository } from "./repositories/task-comments.repository";
import { TasksRepository } from "./repositories/tasks.repository";
import {
  TaskCommentEntity,
  CommentStatus,
} from "./entities/task-comment.entity";
import { TaskEntity, TaskStatus } from "./entities/task.entity";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";

describe("TaskCommentsService", () => {
  let service: TaskCommentsService;
  let commentsRepository: jest.Mocked<TaskCommentsRepository>;
  let tasksRepository: jest.Mocked<TasksRepository>;

  const mockTask: TaskEntity = {
    id: "task-uuid",
    tenant_id: "tenant-uuid",
    column_id: "column-uuid",
    board_id: "board-uuid",
    title: "Test Task",
    description: "Test Description",
    assigned_to: "user-uuid",
    priority: "medium" as any,
    due_date: null,
    position: 0,
    status: TaskStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  } as TaskEntity;

  const mockComment: TaskCommentEntity = {
    id: "comment-uuid",
    tenant_id: "tenant-uuid",
    task_id: "task-uuid",
    user_id: "user-uuid",
    content: "Test comment",
    status: CommentStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  } as TaskCommentEntity;

  beforeEach(async () => {
    const mockCommentsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockTasksRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsService,
        {
          provide: TaskCommentsRepository,
          useValue: mockCommentsRepository,
        },
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    service = module.get<TaskCommentsService>(TaskCommentsService);
    commentsRepository = module.get(TaskCommentsRepository);
    tasksRepository = module.get(TasksRepository);
  });

  describe("create", () => {
    it("should create comment with user_id", async () => {
      const createCommentDto: CreateCommentDto = {
        content: "New comment",
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      commentsRepository.save.mockResolvedValue({
        ...mockComment,
        content: createCommentDto.content,
      } as TaskCommentEntity);

      const result = await service.create(
        "task-uuid",
        createCommentDto,
        "tenant-uuid",
        "user-uuid",
      );

      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: "task-uuid", status: TaskStatus.ACTIVE } as any,
      });
      expect(commentsRepository.save).toHaveBeenCalledWith({
        task_id: "task-uuid",
        content: createCommentDto.content,
        user_id: "user-uuid",
        status: CommentStatus.ACTIVE,
      });
      expect(result.content).toBe(createCommentDto.content);
    });

    it("should throw NotFoundException if task not found", async () => {
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          "non-existent-task",
          { content: "Comment" },
          "tenant-uuid",
          "user-uuid",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAllByTask", () => {
    it("should return ordered comments", async () => {
      const comments = [
        { ...mockComment, id: "comment-1", created_at: new Date("2025-01-01") },
        { ...mockComment, id: "comment-2", created_at: new Date("2025-01-02") },
      ];

      tasksRepository.findOne.mockResolvedValue(mockTask);
      commentsRepository.find.mockResolvedValue(
        comments as TaskCommentEntity[],
      );

      const result = await service.findAllByTask("task-uuid", "tenant-uuid");

      expect(commentsRepository.find).toHaveBeenCalledWith({
        where: {
          task_id: "task-uuid",
          status: CommentStatus.ACTIVE,
        } as any,
        order: { created_at: "ASC" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("comment-1");
    });

    it("should throw NotFoundException if task not found", async () => {
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findAllByTask("non-existent-task", "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update comment if authorized (author)", async () => {
      const updateCommentDto: UpdateCommentDto = {
        content: "Updated comment",
      };

      commentsRepository.findOne.mockResolvedValue(mockComment);
      commentsRepository.save.mockResolvedValue({
        ...mockComment,
        content: updateCommentDto.content,
      } as TaskCommentEntity);

      const result = await service.update(
        "comment-uuid",
        updateCommentDto,
        "tenant-uuid",
        "user-uuid", // Same user as comment author
        [],
      );

      expect(commentsRepository.save).toHaveBeenCalled();
      expect(result.content).toBe(updateCommentDto.content);
    });

    it("should update comment if authorized (admin)", async () => {
      const updateCommentDto: UpdateCommentDto = {
        content: "Updated comment",
      };

      commentsRepository.findOne.mockResolvedValue(mockComment);
      commentsRepository.save.mockResolvedValue({
        ...mockComment,
        content: updateCommentDto.content,
      } as TaskCommentEntity);

      const result = await service.update(
        "comment-uuid",
        updateCommentDto,
        "tenant-uuid",
        "other-user-uuid",
        ["admin"],
      );

      expect(result.content).toBe(updateCommentDto.content);
    });

    it("should throw ForbiddenException if unauthorized", async () => {
      commentsRepository.findOne.mockResolvedValue(mockComment);

      await expect(
        service.update(
          "comment-uuid",
          { content: "Updated" },
          "tenant-uuid",
          "other-user-uuid", // Not author
          [], // Not admin
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if comment not found", async () => {
      commentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          "non-existent-comment",
          { content: "Updated" },
          "tenant-uuid",
          "user-uuid",
          [],
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete comment if authorized (author)", async () => {
      commentsRepository.findOne.mockResolvedValue(mockComment);
      commentsRepository.save.mockResolvedValue({
        ...mockComment,
        status: CommentStatus.DELETED,
      } as TaskCommentEntity);

      await service.remove("comment-uuid", "tenant-uuid", "user-uuid", []);

      expect(commentsRepository.save).toHaveBeenCalledWith({
        ...mockComment,
        status: CommentStatus.DELETED,
      });
    });

    it("should soft delete comment if authorized (admin)", async () => {
      commentsRepository.findOne.mockResolvedValue(mockComment);
      commentsRepository.save.mockResolvedValue({
        ...mockComment,
        status: CommentStatus.DELETED,
      } as TaskCommentEntity);

      await service.remove("comment-uuid", "tenant-uuid", "other-user-uuid", [
        "admin",
      ]);

      expect(commentsRepository.save).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if unauthorized", async () => {
      commentsRepository.findOne.mockResolvedValue(mockComment);

      await expect(
        service.remove("comment-uuid", "tenant-uuid", "other-user-uuid", []),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if comment not found", async () => {
      commentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove("non-existent-comment", "tenant-uuid", "user-uuid", []),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
