import { Test, TestingModule } from "@nestjs/testing";
import { BoardsController } from "./boards.controller";
import { BoardsService } from "./boards.service";
import { BoardEntity, BoardStatus } from "./entities/board.entity";

describe("BoardsController", () => {
  let controller: BoardsController;
  let service: jest.Mocked<BoardsService>;

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
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardsController],
      providers: [
        {
          provide: BoardsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<BoardsController>(BoardsController);
    service = module.get(BoardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create board and return success response", async () => {
      const createDto = { name: "New Board", description: "Description" };
      service.create.mockResolvedValue(mockBoard);

      const result = await controller.create(createDto, "tenant-uuid", {
        userId: "user-uuid",
      });

      expect(result).toEqual(mockBoard);
      expect(service.create).toHaveBeenCalledWith(
        createDto,
        "tenant-uuid",
        "user-uuid",
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated list", async () => {
      service.findAll.mockResolvedValue({ data: [mockBoard], total: 1 });

      await controller.findAll("tenant-uuid", "1", "20");

      expect(service.findAll).toHaveBeenCalledWith("tenant-uuid", 1, 20);
    });

    it("should use default pagination values", async () => {
      service.findAll.mockResolvedValue({ data: [mockBoard], total: 1 });

      const result = await controller.findAll("tenant-uuid");

      expect(service.findAll).toHaveBeenCalledWith("tenant-uuid", 1, 20);
    });
  });

  describe("findOne", () => {
    it("should return board with relations", async () => {
      service.findOne.mockResolvedValue(mockBoard);

      const result = await controller.findOne("board-uuid", "tenant-uuid");

      expect(result).toEqual(mockBoard);
      expect(service.findOne).toHaveBeenCalledWith("board-uuid", "tenant-uuid");
    });
  });

  describe("update", () => {
    it("should update board if authorized", async () => {
      const updateDto = { name: "Updated Name" };
      const updatedBoard = { ...mockBoard, name: "Updated Name" };
      service.update.mockResolvedValue(updatedBoard as BoardEntity);

      const result = await controller.update(
        "board-uuid",
        updateDto,
        "tenant-uuid",
        { userId: "user-uuid", roles: [] },
      );

      expect(result).toEqual(updatedBoard);
      expect(service.update).toHaveBeenCalledWith(
        "board-uuid",
        updateDto,
        "tenant-uuid",
        "user-uuid",
        [],
      );
    });
  });

  describe("remove", () => {
    it("should soft delete board if authorized", async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove("board-uuid", "tenant-uuid", {
        userId: "user-uuid",
        roles: [],
      });

      expect(result).toEqual({
        success: true,
        message: "Board deleted successfully",
      });
      expect(service.remove).toHaveBeenCalledWith(
        "board-uuid",
        "tenant-uuid",
        "user-uuid",
        [],
      );
    });
  });
});
