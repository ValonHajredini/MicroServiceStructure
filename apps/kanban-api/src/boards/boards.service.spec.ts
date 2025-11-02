import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { BoardsRepository } from "./repositories/boards.repository";
import { BoardEntity, BoardStatus } from "./entities/board.entity";
import { CreateBoardDto } from "./dto/create-board.dto";
import { UpdateBoardDto } from "./dto/update-board.dto";
import { ColumnsRepository } from "../columns/repositories/columns.repository";
import { TasksRepository } from "../tasks/repositories/tasks.repository";

describe("BoardsService", () => {
  let service: BoardsService;
  let repository: jest.Mocked<BoardsRepository>;
  let columnsRepository: jest.Mocked<ColumnsRepository>;
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

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockBoard], 1]),
      })),
      repository: {
        findAndCount: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
      },
    };

    const mockColumnsRepository = {
      save: jest.fn(),
    };

    const mockTasksRepository = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        {
          provide: BoardsRepository,
          useValue: mockRepository,
        },
        {
          provide: ColumnsRepository,
          useValue: mockColumnsRepository,
        },
        {
          provide: TasksRepository,
          useValue: mockTasksRepository,
        },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
    repository = module.get(BoardsRepository);
    columnsRepository = module.get(ColumnsRepository);
    tasksRepository = module.get(TasksRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create board with tenant_id and owner_id", async () => {
      const createDto: CreateBoardDto = {
        name: "New Board",
        description: "New Description",
      };

      repository.save.mockResolvedValue(mockBoard);

      const result = await service.create(
        createDto,
        "tenant-uuid",
        "user-uuid",
      );

      expect(result).toEqual(mockBoard);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Board",
          description: "New Description",
          owner_id: "user-uuid",
          status: BoardStatus.ACTIVE,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated boards filtered by tenant", async () => {
      const boards = [mockBoard];

      const result = await service.findAll("tenant-uuid", 1, 20);

      expect(result.data).toEqual(boards);
      expect(result.total).toBe(1);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith("board");
    });
  });

  describe("findOne", () => {
    it("should return board with relations", async () => {
      repository.findOne.mockResolvedValue(mockBoard);

      const result = await service.findOne("board-uuid", "tenant-uuid");

      expect(result).toEqual(mockBoard);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "board-uuid",
            tenant_id: "tenant-uuid",
            status: BoardStatus.ACTIVE,
          },
          relations: ["columns", "columns.tasks", "columns.tasks.comments"],
        }),
      );
    });

    it("should throw NotFoundException if board not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne("invalid-uuid", "tenant-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update board if user is owner", async () => {
      const updateDto: UpdateBoardDto = { name: "Updated Name" };
      repository.findOne.mockResolvedValue(mockBoard);
      repository.save.mockResolvedValue({
        ...mockBoard,
        name: "Updated Name",
      } as BoardEntity);

      const result = await service.update(
        "board-uuid",
        updateDto,
        "tenant-uuid",
        "user-uuid",
        [],
      );

      expect(result.name).toBe("Updated Name");
    });

    it("should update board if user is admin", async () => {
      const updateDto: UpdateBoardDto = { name: "Updated Name" };
      repository.findOne.mockResolvedValue(mockBoard);
      repository.save.mockResolvedValue({
        ...mockBoard,
        name: "Updated Name",
      } as BoardEntity);

      const result = await service.update(
        "board-uuid",
        updateDto,
        "tenant-uuid",
        "other-user-uuid",
        ["admin"],
      );

      expect(result.name).toBe("Updated Name");
    });

    it("should throw ForbiddenException if user is not owner or admin", async () => {
      repository.findOne.mockResolvedValue(mockBoard);

      await expect(
        service.update(
          "board-uuid",
          { name: "Updated Name" },
          "tenant-uuid",
          "other-user-uuid",
          [],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if board not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          "invalid-uuid",
          { name: "Updated Name" },
          "tenant-uuid",
          "user-uuid",
          [],
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete board if user is owner", async () => {
      repository.findOne.mockResolvedValue(mockBoard);
      repository.save.mockResolvedValue({
        ...mockBoard,
        status: BoardStatus.DELETED,
      } as BoardEntity);

      await service.remove("board-uuid", "tenant-uuid", "user-uuid", []);

      expect(repository.save).toHaveBeenCalled();
    });

    it("should soft delete board if user is admin", async () => {
      repository.findOne.mockResolvedValue(mockBoard);
      repository.save.mockResolvedValue({
        ...mockBoard,
        status: BoardStatus.DELETED,
      } as BoardEntity);

      await service.remove("board-uuid", "tenant-uuid", "other-user-uuid", [
        "admin",
      ]);

      expect(repository.save).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not owner or admin", async () => {
      repository.findOne.mockResolvedValue(mockBoard);

      await expect(
        service.remove("board-uuid", "tenant-uuid", "other-user-uuid", []),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if board not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.remove("invalid-uuid", "tenant-uuid", "user-uuid", []),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
