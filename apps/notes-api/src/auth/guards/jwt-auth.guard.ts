import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 * Applies JWT validation to protected routes
 *
 * This guard:
 * 1. Intercepts incoming requests
 * 2. Validates JWT token via JwtStrategy
 * 3. Attaches user object to request if valid
 * 4. Returns 401 Unauthorized if token is invalid/missing
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
