import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Note } from '../../notes/entities/note.entity';

/**
 * ResourceOwnerGuard
 * Authorization helper to check if user can modify a resource
 * AC: 7 - Only resource owner or tenant admin can update/delete
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const resource = request.resource; // Resource should be attached to request by controller

    if (!resource || !user) {
      throw new ForbiddenException('Unable to verify resource ownership');
    }

    return this.canModifyNote(resource, user);
  }

  /**
   * Helper method: Check if user can modify note
   * @param note - The note resource
   * @param user - JWT payload with user context
   * @returns true if user owns the note OR is admin
   */
  canModifyNote(note: Note, user: JwtPayload): boolean {
    return note.user_id === user.sub || user.roles.includes('admin');
  }
}
