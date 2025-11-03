import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { BoardsService } from "../boards/boards.service";

@WebSocketGateway({
  namespace: "/kanban",
  cors: {
    origin: (
      process.env.WEBSOCKET_CORS_ORIGINS ||
      "http://localhost:4200,http://localhost:4201"
    ).split(","),
    credentials: true,
  },
})
export class KanbanGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger;

  constructor(
    private readonly jwtService: JwtService,
    private readonly boardsService: BoardsService,
  ) {
    this.logger = new Logger(KanbanGateway.name);
  }

  afterInit(server: Server) {
    // Initialize logger if not already initialized
    if (!this.logger) {
      this.logger = new Logger(KanbanGateway.name);
    }
    this.logger.log("WebSocket Gateway initialized");

    /**
     * Connection Management (Task 5):
     * - Heartbeat/ping: Socket.io handles automatic heartbeat via pingTimeout and pingInterval
     * - Reconnection logic: Socket.io client automatically attempts reconnection on disconnect
     * - Fallback mechanism: Client should implement polling fallback using GET /api/v1/boards/:id/updates
     *   when WebSocket connection fails (polling interval: 5 seconds)
     *
     * Socket.io default configuration:
     * - pingTimeout: 5000ms
     * - pingInterval: 25000ms
     * - Automatic reconnection with exponential backoff
     */
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload: JwtPayload = await this.jwtService.verifyAsync(token);

      // Store user info in socket data
      client.data.user = payload;
      client.data.tenantId = payload.tenantId;

      this.logger.log(
        `Client connected: ${client.id} (User: ${payload.sub}, Tenant: ${payload.tenantId})`,
      );
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} connection rejected: Invalid token`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.sub || "unknown";
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  /**
   * Handle join-board event from client
   * Client subscribes to board updates by joining a room
   */
  @SubscribeMessage("join-board")
  async handleJoinBoard(
    @MessageBody() data: { boardId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await this.joinBoardRoom(client, data.boardId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to join board ${data.boardId}: ${error.message}`,
      );
      throw new WsException(error.message);
    }
  }

  /**
   * Handle leave-board event from client
   * Client unsubscribes from board updates by leaving the room
   */
  @SubscribeMessage("leave-board")
  async handleLeaveBoard(
    @MessageBody() data: { boardId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ success: boolean }> {
    try {
      await this.leaveBoardRoom(client, data.boardId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to leave board ${data.boardId}: ${error.message}`,
      );
      throw new WsException(error.message);
    }
  }

  /**
   * Join a board room for real-time updates
   * @param client Socket client
   * @param boardId Board ID to join
   */
  private async joinBoardRoom(client: Socket, boardId: string): Promise<void> {
    const tenantId = client.data.tenantId;
    const userId = client.data.user.sub;

    // Verify user has access to this board
    try {
      await this.boardsService.findOne(boardId, tenantId);
    } catch (error) {
      throw new WsException(
        `Access denied: Board ${boardId} not found or unauthorized`,
      );
    }

    const roomName = `board:${boardId}`;
    await client.join(roomName);
    this.logger.debug(
      `Client ${client.id} joined room ${roomName} (User: ${userId}, Tenant: ${tenantId})`,
    );
  }

  /**
   * Leave a board room
   * @param client Socket client
   * @param boardId Board ID to leave
   */
  private async leaveBoardRoom(client: Socket, boardId: string): Promise<void> {
    const roomName = `board:${boardId}`;
    await client.leave(roomName);
    this.logger.debug(`Client ${client.id} left room ${roomName}`);
  }

  /**
   * Emit task created event to board room
   */
  emitTaskCreated(boardId: string, tenantId: string, task: any): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized, skipping task:created event');
      return;
    }
    this.server.to(`board:${boardId}`).emit("task:created", {
      type: "task:created",
      data: task,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit task updated event to board room
   */
  emitTaskUpdated(boardId: string, tenantId: string, task: any): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized, skipping task:updated event');
      return;
    }
    this.server.to(`board:${boardId}`).emit("task:updated", {
      type: "task:updated",
      data: task,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit task moved event to board room
   */
  emitTaskMoved(
    boardId: string,
    tenantId: string,
    taskId: string,
    oldColumnId: string,
    newColumnId: string,
    newPosition: number,
  ): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized, skipping task:moved event');
      return;
    }
    this.server.to(`board:${boardId}`).emit("task:moved", {
      type: "task:moved",
      data: {
        id: taskId,
        old_column_id: oldColumnId,
        new_column_id: newColumnId,
        new_position: newPosition,
      },
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit column added event to board room
   */
  emitColumnAdded(boardId: string, tenantId: string, column: any): void {
    if (!this.server) {
      this.logger.warn("WebSocket server not initialized - skipping column:added event");
      return;
    }
    this.server.to(`board:${boardId}`).emit("column:added", {
      type: "column:added",
      data: column,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit column reordered event to board room
   */
  emitColumnReordered(boardId: string, tenantId: string, columns: any[]): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized, skipping column:reordered event');
      return;
    }
    this.server.to(`board:${boardId}`).emit("column:reordered", {
      type: "column:reordered",
      data: columns,
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit comment added event to board room
   */
  emitCommentAdded(
    boardId: string,
    tenantId: string,
    taskId: string,
    comment: any,
  ): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized, skipping comment:added event');
      return;
    }
    this.server.to(`board:${boardId}`).emit("comment:added", {
      type: "comment:added",
      data: {
        taskId,
        comment,
      },
      tenantId,
      timestamp: new Date().toISOString(),
    });
  }
}
