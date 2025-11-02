import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { KanbanGateway } from "./kanban.gateway";
import { BoardsService } from "../boards/boards.service";
import { NotFoundException } from "@nestjs/common";

describe("KanbanGateway", () => {
  let gateway: KanbanGateway;
  let jwtService: JwtService;
  let boardsService: BoardsService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockBoardsService = {
    findOne: jest.fn(),
  };

  const mockClient: any = {
    id: "test-client-id",
    handshake: {
      auth: { token: "valid-token" },
      headers: {},
    },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockServer: any = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KanbanGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: BoardsService, useValue: mockBoardsService },
      ],
    }).compile();

    gateway = module.get<KanbanGateway>(KanbanGateway);
    jwtService = module.get<JwtService>(JwtService);
    boardsService = module.get<BoardsService>(BoardsService);

    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleConnection", () => {
    it("should accept connection with valid JWT token", async () => {
      const payload = {
        sub: "user-123",
        tenantId: "tenant-123",
        email: "test@example.com",
      };

      mockJwtService.verifyAsync.mockResolvedValue(payload);

      await gateway.handleConnection(mockClient);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("valid-token");
      expect(mockClient.data.user).toEqual(payload);
      expect(mockClient.data.tenantId).toBe("tenant-123");
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it("should reject connection without token", async () => {
      const clientWithoutToken = {
        ...mockClient,
        handshake: { auth: {}, headers: {} },
      };

      await gateway.handleConnection(clientWithoutToken);

      expect(clientWithoutToken.disconnect).toHaveBeenCalled();
    });

    it("should reject connection with invalid token", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Invalid token"));

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe("handleJoinBoard", () => {
    beforeEach(() => {
      mockClient.data = {
        user: { sub: "user-123" },
        tenantId: "tenant-123",
      };
    });

    it("should allow joining board with valid access", async () => {
      const mockBoard = { id: "board-123", tenant_id: "tenant-123" };
      mockBoardsService.findOne.mockResolvedValue(mockBoard);

      const result = await gateway.handleJoinBoard(
        { boardId: "board-123" },
        mockClient,
      );

      expect(boardsService.findOne).toHaveBeenCalledWith(
        "board-123",
        "tenant-123",
      );
      expect(mockClient.join).toHaveBeenCalledWith("board:board-123");
      expect(result).toEqual({ success: true });
    });

    it("should reject joining board without access", async () => {
      mockBoardsService.findOne.mockRejectedValue(
        new NotFoundException("Board not found"),
      );

      await expect(
        gateway.handleJoinBoard({ boardId: "board-123" }, mockClient),
      ).rejects.toThrow(WsException);

      expect(mockClient.join).not.toHaveBeenCalled();
    });
  });

  describe("handleLeaveBoard", () => {
    it("should allow leaving board room", async () => {
      mockClient.data = {
        user: { sub: "user-123" },
        tenantId: "tenant-123",
      };

      const result = await gateway.handleLeaveBoard(
        { boardId: "board-123" },
        mockClient,
      );

      expect(mockClient.leave).toHaveBeenCalledWith("board:board-123");
      expect(result).toEqual({ success: true });
    });
  });

  describe("Event Emission", () => {
    it("should emit task:created event to board room", () => {
      const task = { id: "task-123", title: "Test Task" };

      gateway.emitTaskCreated("board-123", "tenant-123", task);

      expect(mockServer.to).toHaveBeenCalledWith("board:board-123");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "task:created",
        expect.objectContaining({
          type: "task:created",
          data: task,
          tenantId: "tenant-123",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should emit task:updated event to board room", () => {
      const task = { id: "task-123", title: "Updated Task" };

      gateway.emitTaskUpdated("board-123", "tenant-123", task);

      expect(mockServer.to).toHaveBeenCalledWith("board:board-123");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "task:updated",
        expect.objectContaining({
          type: "task:updated",
          data: task,
          tenantId: "tenant-123",
        }),
      );
    });

    it("should emit task:moved event to board room", () => {
      gateway.emitTaskMoved(
        "board-123",
        "tenant-123",
        "task-123",
        "col-1",
        "col-2",
        0,
      );

      expect(mockServer.to).toHaveBeenCalledWith("board:board-123");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "task:moved",
        expect.objectContaining({
          type: "task:moved",
          data: {
            id: "task-123",
            old_column_id: "col-1",
            new_column_id: "col-2",
            new_position: 0,
          },
          tenantId: "tenant-123",
        }),
      );
    });

    it("should emit column:added event to board room", () => {
      const column = { id: "col-123", name: "New Column" };

      gateway.emitColumnAdded("board-123", "tenant-123", column);

      expect(mockServer.to).toHaveBeenCalledWith("board:board-123");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "column:added",
        expect.objectContaining({
          type: "column:added",
          data: column,
          tenantId: "tenant-123",
        }),
      );
    });

    it("should emit comment:added event to board room", () => {
      const comment = { id: "comment-123", text: "Test comment" };

      gateway.emitCommentAdded("board-123", "tenant-123", "task-123", comment);

      expect(mockServer.to).toHaveBeenCalledWith("board:board-123");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "comment:added",
        expect.objectContaining({
          type: "comment:added",
          data: {
            taskId: "task-123",
            comment,
          },
          tenantId: "tenant-123",
        }),
      );
    });
  });
});
