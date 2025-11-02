import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUserData {
  userId: string;
  email?: string;
  tenantId: string;
  roles?: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return {
      userId: request.user?.userId || request.userId,
      email: request.user?.email,
      tenantId: request.user?.tenantId || request.tenantId,
      roles: request.user?.roles || [],
    };
  },
);
