import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '@shared-types';

interface RequestWithUser {
  user: JwtPayload;
}

@Injectable()
export class ServiceEnabledGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredService = this.reflector.get<string>(
      'requiredService',
      context.getHandler(),
    );

    if (!requiredService) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user: JwtPayload = request.user;

    if (!user || !user.enabledServices) {
      throw new ForbiddenException('Service access information not available');
    }

    if (!user.enabledServices.includes(requiredService)) {
      throw new ForbiddenException(
        `Service '${requiredService}' is not enabled for your organization`,
      );
    }

    return true;
  }
}
