import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ColumnsService } from "./columns.service";
import { ColumnsRepository } from "./repositories/columns.repository";
import { BoardsRepository } from "../boards/repositories/boards.repository";
import { TasksRepository } from "../tasks/repositories/tasks.repository";
import { ColumnEntity, ColumnStatus } from "./entities/column.entity";
import { CreateColumnDto } from "./dto/create-column.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { BoardEntity, BoardStatus } from "../boards/entities/board.entity";
import { TaskEntity, TaskStatus } from "../tasks/entities/task.entity";

describe("ColumnsService", () => {
  let service: ColumnsService;
  let columnsRepository: jest.Mocked<ColumnsRepository>;
  let boardsRepository: jest.Mocked<BoardsRepository>;
  let tasksRepository: jest.Mocked<TasksRepository>;

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

  beforeEach(async () => {
    const mockColumnsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockBoardsRepository = {
      findOne: jest.fn(),
    };

    const mockTasksRepository = {
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnsService,
        {
          provide: ColumnsRepository,
          useValue: mockColumnsRepository,
        },
        {
          provide: BoardsRepository,
          useValue: mockBoardsRepository,
        },
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    service = module.get<ColumnsService>(ColumnsService);
    columnsRepository = module.get(ColumnsRepository);
    boardsRepository = module.get(BoardsRepository);
    tasksRepository = module.get(TasksRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create column with auto-position when not provided", async () => {
      const createDto: CreateColumnDto = {
        title: "In Progress",
      };

      boardsRepository.findOne.mockResolvedValue(mockBoard);
      columnsRepository.find.mockResolvedValue([]);
      columnsRepository.save.mockResolvedValue({
        ...mockColumn,
        title: "In Progress",
        position: 0,
      });

      const result = await service.create(
        "board-uuid",
        createDto,
        "tenant-uuid",
      );

      expect(result.title).toBe("In Progress");
      expect(result.position).toBe(0);
      expect(boardsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: "board-uuid",
          status: BoardStatus.ACTIVE,
        },
      });
      expect(columnsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          board_id: "board-uuid",
          title: "In Progress",
          position: 0,
          status: ColumnStatus.ACTIVE,
        }),
      );
    });

    it("should create column with provided position", async () => {
      const createDto: CreateColumnDto = {
        title: "Done",
        position: 2,
      };

      boardsRepository.findOne.mockResolvedValue(mockBoard);
      columnsRepository.save.mockResolvedValue({
        ...mockColumn,
        title: "Done",
        position: 2,
      });

      const result = await service.create(
        "board-uuid",
        createDto,
        "tenant-uuid",
      );

      expect(result.position).toBe(2);
      expect(columnsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          position: 2,
        }),
      );
    });

    it("should auto-assign position as max + 1 when existing columns", async () => {
      const createDto: CreateColumnDto = {
        title: "Review",
      };

      const existingColumn = { ...mockColumn, position: 2 };

      boardsRepository.findOne.mockResolvedValue(mockBoard);
      columnsRepository.find.mockResolvedValue([existingColumn]);
      columnsRepository.save.mockResolvedValue({
        ...mockColumn,
        title: "Review",
        position: 3,
      });

      const result = await service.create(
        "board-uuid",
        createDto,
        "tenant-uuid",
      );

      expect(result.position).toBe(3);
    });

    it("should throw NotFoundException if board does not exist", async () => {
      const createDto: CreateColumnDto = {
        title: "New Column",
      };

      boardsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create("invalid-board", createDto, "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAllByBoard", () => {
    it("should return columns sorted by position", async () => {
      const columns = [
        { ...mockColumn, id: "col-1", position: 1 },
        { ...mockColumn, id: "col-2", position: 0 },
      ];

      columnsRepository.find.mockResolvedValue(columns);

      const result = await service.findAllByBoard("board-uuid", "tenant-uuid");

      expect(result).toEqual(columns);
      expect(columnsRepository.find).toHaveBeenCalledWith({
        where: {
          board_id: "board-uuid",
          status: ColumnStatus.ACTIVE,
        },
        order: { position: "ASC" },
      });
    });
  });

  describe("findOne", () => {
    it("should return column by id", async () => {
      columnsRepository.findOne.mockResolvedValue(mockColumn);

      const result = await service.findOne("column-uuid", "tenant-uuid");

      expect(result).toEqual(mockColumn);
      expect(columnsRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: "column-uuid",
          status: ColumnStatus.ACTIVE,
        },
      });
    });

    it("should throw NotFoundException if column not found", async () => {
      columnsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne("invalid-column", "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update column title", async () => {
      const updateDto: UpdateColumnDto = {
        title: "Updated Title",
      };

      columnsRepository.findOne.mockResolvedValue(mockColumn);
      columnsRepository.find.mockResolvedValue([mockColumn]);
      columnsRepository.save.mockResolvedValue({
        ...mockColumn,
        title: "Updated Title",
      });

      const result = await service.update(
        "column-uuid",
        updateDto,
        "tenant-uuid",
      );

      expect(result.title).toBe("Updated Title");
      expect(columnsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Title",
        }),
      );
    });

    it("should handle position reordering when moving up", async () => {
      const column1 = { ...mockColumn, id: "col-1", position: 0 };
      const column2 = { ...mockColumn, id: "col-2", position: 1 };
      const column3 = { ...mockColumn, id: "col-3", position: 2 };

      const updateDto: UpdateColumnDto = {
        position: 0,
      };

      columnsRepository.findOne.mockResolvedValue(column3);
      columnsRepository.find.mockResolvedValue([column1, column2, column3]);
      columnsRepository.save
        .mockResolvedValueOnce(column2) // Save column2 with position 2
        .mockResolvedValueOnce(column1) // Save column1 with position 1
        .mockResolvedValueOnce(column3); // Save column3 with position 0

      const result = await service.update("col-3", updateDto, "tenant-uuid");

      expect(columnsRepository.save).toHaveBeenCalledTimes(3);
    });

    it("should handle position reordering when moving down", async () => {
      const column1 = { ...mockColumn, id: "col-1", position: 0 };
      const column2 = { ...mockColumn, id: "col-2", position: 1 };
      const column3 = { ...mockColumn, id: "col-3", position: 2 };

      const updateDto: UpdateColumnDto = {
        position: 2,
      };

      columnsRepository.findOne.mockResolvedValue(column1);
      columnsRepository.find.mockResolvedValue([column1, column2, column3]);
      columnsRepository.save
        .mockResolvedValueOnce(column2) // Save column2 with position 0
        .mockResolvedValueOnce(column3) // Save column3 with position 1
        .mockResolvedValueOnce(column1); // Save column1 with position 2

      await service.update("col-1", updateDto, "tenant-uuid");

      expect(columnsRepository.save).toHaveBeenCalledTimes(3);
    });

    it("should throw NotFoundException if column not found", async () => {
      columnsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update("invalid-column", {}, "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should move tasks to first column before deleting", async () => {
      const firstColumn = { ...mockColumn, id: "col-1", position: 0 };
      const columnToDelete = { ...mockColumn, id: "col-2", position: 1 };

      const task1: TaskEntity = {
        id: "task-1",
        column_id: "col-2",
        position: 0,
      } as TaskEntity;

      columnsRepository.findOne.mockResolvedValue(columnToDelete);
      columnsRepository.find.mockResolvedValue([firstColumn, columnToDelete]);
      tasksRepository.find.mockResolvedValue([task1]);
      tasksRepository.save.mockResolvedValue({
        ...task1,
        column_id: "col-1",
      } as TaskEntity);
      columnsRepository.save.mockResolvedValue({
        ...columnToDelete,
        status: ColumnStatus.DELETED,
      });

      await service.remove("col-2", "tenant-uuid");

      expect(tasksRepository.find).toHaveBeenCalledWith({
        where: {
          column_id: "col-2",
          status: TaskStatus.ACTIVE,
        },
      });
      expect(tasksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          column_id: "col-1",
        }),
      );
      expect(columnsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ColumnStatus.DELETED,
        }),
      );
    });

    it("should soft delete column even if no other columns exist", async () => {
      const columnToDelete = { ...mockColumn, id: "col-1", position: 0 };

      columnsRepository.findOne.mockResolvedValue(columnToDelete);
      columnsRepository.find.mockResolvedValue([columnToDelete]);
      columnsRepository.save.mockResolvedValue({
        ...columnToDelete,
        status: ColumnStatus.DELETED,
      });

      await service.remove("col-1", "tenant-uuid");

      expect(columnsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ColumnStatus.DELETED,
        }),
      );
    });

    it("should throw NotFoundException if column not found", async () => {
      columnsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove("invalid-column", "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("reorderColumns", () => {
    it("should update column positions based on new order", async () => {
      const column1 = { ...mockColumn, id: "col-1", position: 0 };
      const column2 = { ...mockColumn, id: "col-2", position: 1 };
      const column3 = { ...mockColumn, id: "col-3", position: 2 };

      columnsRepository.find.mockResolvedValue([column1, column2, column3]);
      columnsRepository.save
        .mockResolvedValueOnce({ ...column2, position: 0 })
        .mockResolvedValueOnce({ ...column1, position: 1 })
        .mockResolvedValueOnce({ ...column3, position: 2 });

      await service.reorderColumns(
        "board-uuid",
        ["col-2", "col-1", "col-3"],
        "tenant-uuid",
      );

      expect(columnsRepository.save).toHaveBeenCalledTimes(2); // Only save changed positions
    });

    it("should throw BadRequestException if column count mismatch", async () => {
      const column1 = { ...mockColumn, id: "col-1", position: 0 };

      columnsRepository.find.mockResolvedValue([column1]);

      await expect(
        service.reorderColumns("board-uuid", ["col-1", "col-2"], "tenant-uuid"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if column not in board", async () => {
      const column1 = { ...mockColumn, id: "col-1", position: 0 };

      columnsRepository.find.mockResolvedValue([column1]);

      await expect(
        service.reorderColumns("board-uuid", ["invalid-col"], "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("checkWipLimit", () => {
    it("should return true if no WIP limit set", async () => {
      const column = { ...mockColumn, wip_limit: null };
      columnsRepository.findOne.mockResolvedValue(column);

      const result = await service.checkWipLimit("column-uuid", "tenant-uuid");

      expect(result).toBe(true);
    });

    it("should return true if under WIP limit", async () => {
      const column = { ...mockColumn, wip_limit: 5 };
      columnsRepository.findOne.mockResolvedValue(column);
      tasksRepository.count.mockResolvedValue(3);

      const result = await service.checkWipLimit("column-uuid", "tenant-uuid");

      expect(result).toBe(true);
      expect(tasksRepository.count).toHaveBeenCalledWith({
        where: {
          column_id: "column-uuid",
          status: TaskStatus.ACTIVE,
        },
      });
    });

    it("should return false if at or over WIP limit", async () => {
      const column = { ...mockColumn, wip_limit: 5 };
      columnsRepository.findOne.mockResolvedValue(column);
      tasksRepository.count.mockResolvedValue(5);

      const result = await service.checkWipLimit("column-uuid", "tenant-uuid");

      expect(result).toBe(false);
      expect(tasksRepository.count).toHaveBeenCalledWith({
        where: {
          column_id: "column-uuid",
          status: TaskStatus.ACTIVE,
        },
      });
    });
  });
});
