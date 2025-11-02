import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { KanbanGateway } from "./kanban.gateway";
import { BoardsModule } from "../boards/boards.module";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") || "default-secret",
        signOptions: {
          expiresIn: "24h",
        },
      }),
    }),
    forwardRef(() => BoardsModule),
  ],
  providers: [KanbanGateway],
  exports: [KanbanGateway],
})
export class WebsocketModule {}
