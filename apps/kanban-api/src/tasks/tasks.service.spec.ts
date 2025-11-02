import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { TasksRepository } from "./repositories/tasks.repository";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { BoardsRepository } from "../boards/repositories/boards.repository";
import { TaskActivityService } from "./task-activity.service";
import { TaskEntity, TaskPriority, TaskStatus } from "./entities/task.entity";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { ColumnEntity, ColumnStatus } from "../columns/entities/column.entity";
import { BoardEntity, BoardStatus } from "../boards/entities/board.entity";

describe("TasksService", () => {
  let service: TasksService;
  let tasksRepository: jest.Mocked<TasksRepository>;
  let columnsRepository: jest.Mocked<ColumnsRepository>;
  let boardsRepository: jest.Mocked<BoardsRepository>;

  const mockBoard: BoardEntity = {
    id: "board-uuid",
    tenant_id: "tenant-uuid",
    owner_id: "user-uuid",
    name: "Test Board",
    description: "Test Description",
    status: BoardStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  } as BoardEntity;

  const mockColumn: ColumnEntity = {
    id: "column-uuid",
    tenant_id: "tenant-uuid",
    board_id: "board-uuid",
    title: "To Do",
    position: 0,
    wip_limit: null,
    status: ColumnStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  } as ColumnEntity;

  const mockTask: TaskEntity = {
    id: "task-uuid",
    tenant_id: "tenant-uuid",
    column_id: "column-uuid",
    board_id: "board-uuid",
    title: "Test Task",
    description: "Test Description",
    assigned_to: "user-uuid",
    priority: TaskPriority.MEDIUM,
    due_date: null,
    position: 0,
    status: TaskStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  } as TaskEntity;

  beforeEach(async () => {
    const mockTasksRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockColumnsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockBoardsRepository = {
      findOne: jest.fn(),
    };

    const mockActivityService = {
      logActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
        {
          provide: ColumnsRepository,
          useValue: mockColumnsRepository,
        },
        {
          provide: BoardsRepository,
          useValue: mockBoardsRepository,
        },
        {
          provide: TaskActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    tasksRepository = module.get(TasksRepository);
    columnsRepository = module.get(ColumnsRepository);
    boardsRepository = module.get(BoardsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create task with auto-position when not provided", async () => {
      const createDto: CreateTaskDto = {
        title: "New Task",
        priority: TaskPriority.HIGH,
      };

      columnsRepository.findOne.mockResolvedValue(mockColumn);
      tasksRepository.find.mockResolvedValue([]);
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        title: "New Task",
        priority: TaskPriority.HIGH,
        position: 0,
      });

      const result = await service.create(
        "column-uuid",
        createDto,
        "tenant-uuid",
      );

      expect(result.title).toBe("New Task");
      expect(result.position).toBe(0);
      expect(columnsRepository.findOne).toHaveBeenCalled();
      expect(tasksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          column_id: "column-uuid",
          board_id: "board-uuid",
          title: "New Task",
          priority: TaskPriority.HIGH,
          position: 0,
          status: TaskStatus.ACTIVE,
        }),
      );
    });

    it("should throw NotFoundException if column not found", async () => {
      const createDto: CreateTaskDto = {
        title: "New Task",
      };

      columnsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create("column-uuid", createDto, "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should auto-assign max position + 1", async () => {
      const createDto: CreateTaskDto = {
        title: "New Task",
      };

      columnsRepository.findOne.mockResolvedValue(mockColumn);
      tasksRepository.find.mockResolvedValue([
        { ...mockTask, position: 2 },
      ] as TaskEntity[]);
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        title: "New Task",
        position: 3,
      });

      const result = await service.create(
        "column-uuid",
        createDto,
        "tenant-uuid",
      );

      expect(result.position).toBe(3);
    });
  });

  describe("findOne", () => {
    it("should return task with comments", async () => {
      const taskWithComments = {
        ...mockTask,
        comments: [],
      };

      tasksRepository.findOne.mockResolvedValue(taskWithComments);

      const result = await service.findOne("task-uuid", "tenant-uuid");

      expect(result).toEqual(taskWithComments);
      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: "task-uuid", status: TaskStatus.ACTIVE },
        relations: ["comments"],
      });
    });

    it("should throw NotFoundException if task not found", async () => {
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("task-uuid", "tenant-uuid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update task fields if authorized as assignee", async () => {
      const updateDto: UpdateTaskDto = {
        title: "Updated Task",
        description: "Updated Description",
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        title: "Updated Task",
        description: "Updated Description",
      });

      const result = await service.update(
        "task-uuid",
        updateDto,
        "tenant-uuid",
        "user-uuid", // assigned_to
        [],
      );

      expect(result.title).toBe("Updated Task");
      expect(result.description).toBe("Updated Description");
    });

    it("should update task if authorized as board owner", async () => {
      const updateDto: UpdateTaskDto = {
        title: "Updated Task",
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      boardsRepository.findOne.mockResolvedValue(mockBoard);
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        title: "Updated Task",
      });

      const result = await service.update(
        "task-uuid",
        updateDto,
        "tenant-uuid",
        "user-uuid", // board owner
        [],
      );

      expect(result.title).toBe("Updated Task");
      expect(boardsRepository.findOne).toHaveBeenCalled();
    });

    it("should update task if authorized as admin", async () => {
      const updateDto: UpdateTaskDto = {
        title: "Updated Task",
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        title: "Updated Task",
      });

      const result = await service.update(
        "task-uuid",
        updateDto,
        "tenant-uuid",
        "other-user",
        ["admin"],
      );

      expect(result.title).toBe("Updated Task");
    });

    it("should throw ForbiddenException if not authorized", async () => {
      const updateDto: UpdateTaskDto = {
        title: "Updated Task",
      };

      const unauthorizedTask = {
        ...mockTask,
        assigned_to: "other-user",
      };

      tasksRepository.findOne.mockResolvedValue(unauthorizedTask);
      boardsRepository.findOne.mockResolvedValue({
        ...mockBoard,
        owner_id: "other-owner",
      });

      await expect(
        service.update("task-uuid", updateDto, "tenant-uuid", "user-uuid", []),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should handle column change by calling moveTask", async () => {
      const updateDto: UpdateTaskDto = {
        title: "Updated Task",
        columnId: "new-column-uuid",
      };

      boardsRepository.findOne.mockResolvedValue(mockBoard);

      const newColumn = {
        ...mockColumn,
        id: "new-column-uuid",
      };

      tasksRepository.findOne.mockResolvedValueOnce(mockTask); // initial find
      tasksRepository.findOne.mockResolvedValueOnce(mockTask); // moveTask find
      columnsRepository.findOne.mockResolvedValueOnce(mockColumn); // source column
      columnsRepository.findOne.mockResolvedValueOnce(newColumn); // target column
      tasksRepository.find.mockResolvedValue([]); // target column tasks
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        title: "Updated Task",
        column_id: "new-column-uuid",
      });
      tasksRepository.findOne.mockResolvedValueOnce({
        ...mockTask,
        title: "Updated Task",
        column_id: "new-column-uuid",
      }); // reload after move

      const result = await service.update(
        "task-uuid",
        updateDto,
        "tenant-uuid",
        "user-uuid",
        [],
      );

      expect(result.column_id).toBe("new-column-uuid");
    });
  });

  describe("remove", () => {
    it("should soft delete task if authorized as assignee", async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.DELETED,
      });

      await service.remove("task-uuid", "tenant-uuid", "user-uuid", []);

      expect(tasksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TaskStatus.DELETED,
        }),
      );
    });

    it("should throw ForbiddenException if not authorized", async () => {
      const unauthorizedTask = {
        ...mockTask,
        assigned_to: "other-user",
      };

      tasksRepository.findOne.mockResolvedValue(unauthorizedTask);
      boardsRepository.findOne.mockResolvedValue({
        ...mockBoard,
        owner_id: "other-owner",
      });

      await expect(
        service.remove("task-uuid", "tenant-uuid", "user-uuid", []),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("moveTask", () => {
    it("should move task to new column and update position", async () => {
      const newColumn = {
        ...mockColumn,
        id: "new-column-uuid",
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      boardsRepository.findOne.mockResolvedValue(mockBoard); // for authorization check
      columnsRepository.findOne.mockResolvedValueOnce(mockColumn); // source
      columnsRepository.findOne.mockResolvedValueOnce(newColumn); // target
      tasksRepository.find.mockResolvedValue([]); // target column tasks
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        column_id: "new-column-uuid",
        position: 0,
      });

      const result = await service.moveTask(
        "task-uuid",
        "new-column-uuid",
        0,
        "tenant-uuid",
        "user-uuid", // authorized as assignee
        [],
      );

      expect(result.column_id).toBe("new-column-uuid");
      expect(result.position).toBe(0);
    });

    it("should throw NotFoundException if task not found", async () => {
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(
        service.moveTask(
          "task-uuid",
          "new-column-uuid",
          0,
          "tenant-uuid",
          "user-uuid",
          [],
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if user is not authorized", async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      boardsRepository.findOne.mockResolvedValue(mockBoard);

      await expect(
        service.moveTask(
          "task-uuid",
          "new-column-uuid",
          0,
          "tenant-uuid",
          "unauthorized-user", // not assignee, not owner, not admin
          [],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow move if user is board owner", async () => {
      const newColumn = {
        ...mockColumn,
        id: "new-column-uuid",
      };
      const taskNotAssigned = { ...mockTask, assigned_to: null };

      tasksRepository.findOne.mockResolvedValue(taskNotAssigned);
      boardsRepository.findOne.mockResolvedValue(mockBoard); // user-uuid is owner
      columnsRepository.findOne.mockResolvedValueOnce(mockColumn); // source
      columnsRepository.findOne.mockResolvedValueOnce(newColumn); // target
      tasksRepository.find.mockResolvedValue([]); // target column tasks
      tasksRepository.save.mockResolvedValue({
        ...taskNotAssigned,
        column_id: "new-column-uuid",
        position: 0,
      });

      const result = await service.moveTask(
        "task-uuid",
        "new-column-uuid",
        0,
        "tenant-uuid",
        "user-uuid", // authorized as board owner
        [],
      );

      expect(result.column_id).toBe("new-column-uuid");
    });

    it("should allow move if user is admin", async () => {
      const newColumn = {
        ...mockColumn,
        id: "new-column-uuid",
      };
      const taskNotAssigned = { ...mockTask, assigned_to: null };

      tasksRepository.findOne.mockResolvedValue(taskNotAssigned);
      boardsRepository.findOne.mockResolvedValue({
        ...mockBoard,
        owner_id: "other-owner",
      }); // different owner
      columnsRepository.findOne.mockResolvedValueOnce(mockColumn); // source
      columnsRepository.findOne.mockResolvedValueOnce(newColumn); // target
      tasksRepository.find.mockResolvedValue([]); // target column tasks
      tasksRepository.save.mockResolvedValue({
        ...taskNotAssigned,
        column_id: "new-column-uuid",
        position: 0,
      });

      const result = await service.moveTask(
        "task-uuid",
        "new-column-uuid",
        0,
        "tenant-uuid",
        "admin-user",
        ["admin"], // authorized as admin
      );

      expect(result.column_id).toBe("new-column-uuid");
    });

    it("should throw BadRequestException if columns belong to different boards", async () => {
      const differentBoardColumn = {
        ...mockColumn,
        board_id: "different-board-uuid",
      };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      boardsRepository.findOne.mockResolvedValue(mockBoard);
      columnsRepository.findOne.mockResolvedValueOnce(mockColumn); // source
      columnsRepository.findOne.mockResolvedValueOnce(differentBoardColumn); // target

      await expect(
        service.moveTask(
          "task-uuid",
          "new-column-uuid",
          0,
          "tenant-uuid",
          "user-uuid",
          [],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should adjust positions when moving to existing position", async () => {
      const newColumn = {
        ...mockColumn,
        id: "new-column-uuid",
      };

      const existingTask1 = { ...mockTask, id: "task-1", position: 0 };
      const existingTask2 = { ...mockTask, id: "task-2", position: 1 };

      tasksRepository.findOne.mockResolvedValue(mockTask);
      boardsRepository.findOne.mockResolvedValue(mockBoard);
      columnsRepository.findOne.mockResolvedValueOnce(mockColumn); // source
      columnsRepository.findOne.mockResolvedValueOnce(newColumn); // target
      tasksRepository.find.mockResolvedValue([existingTask1, existingTask2]);
      tasksRepository.save.mockResolvedValue({
        ...mockTask,
        column_id: "new-column-uuid",
        position: 0,
      });

      await service.moveTask(
        "task-uuid",
        "new-column-uuid",
        0,
        "tenant-uuid",
        "user-uuid",
        [],
      );

      // Should have shifted existing tasks
      expect(tasksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: "task-1", position: 1 }),
      );
      expect(tasksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: "task-2", position: 2 }),
      );
    });
  });
});
