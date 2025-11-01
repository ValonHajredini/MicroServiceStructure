import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ResourceOwnerGuard } from './resource-owner.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Note } from '../../notes/entities/note.entity';

/**
 * ResourceOwnerGuard Unit Tests
 * QA Fix: TEST-001 - Add missing tests for ResourceOwnerGuard
 */
describe('ResourceOwnerGuard', () => {
  let guard: ResourceOwnerGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResourceOwnerGuard],
    }).compile();

    guard = module.get<ResourceOwnerGuard>(ResourceOwnerGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canModifyNote', () => {
    const mockUser: JwtPayload = {
      sub: 'user-001',
      email: 'user@example.com',
      tenantId: 'tenant-001',
      roles: ['user'],
      enabledServices: ['notes'],
      iat: Date.now(),
      exp: Date.now() + 3600,
    };

    const mockNote: Note = {
      id: 'note-001',
      tenant_id: 'tenant-001',
      user_id: 'user-001',
      title: 'Test Note',
      content: 'Content',
      folder_id: null,
      is_pinned: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      attachments: [],
      folder: null,
    };

    it('should allow note owner to modify their note', () => {
      const result = guard.canModifyNote(mockNote, mockUser);
      expect(result).toBe(true);
    });

    it('should allow admin to modify any note in their tenant', () => {
      const adminUser: JwtPayload = {
        ...mockUser,
        sub: 'admin-001', // Different user ID
        roles: ['admin'],
      };

      const otherUserNote: Note = {
        ...mockNote,
        user_id: 'user-002', // Note owned by different user
      };

      const result = guard.canModifyNote(otherUserNote, adminUser);
      expect(result).toBe(true);
    });

    it('should deny non-owner, non-admin from modifying note', () => {
      const otherUser: JwtPayload = {
        ...mockUser,
        sub: 'user-002', // Different user ID
        roles: ['user'], // Not admin
      };

      const result = guard.canModifyNote(mockNote, otherUser);
      expect(result).toBe(false);
    });

    it('should allow user with multiple roles including admin', () => {
      const adminUser: JwtPayload = {
        ...mockUser,
        sub: 'user-002', // Different user
        roles: ['user', 'admin', 'moderator'], // Multiple roles including admin
      };

      const result = guard.canModifyNote(mockNote, adminUser);
      expect(result).toBe(true);
    });
  });

  describe('canActivate', () => {
    const mockUser: JwtPayload = {
      sub: 'user-001',
      email: 'user@example.com',
      tenantId: 'tenant-001',
      roles: ['user'],
      enabledServices: ['notes'],
      iat: Date.now(),
      exp: Date.now() + 3600,
    };

    const mockNote: Note = {
      id: 'note-001',
      tenant_id: 'tenant-001',
      user_id: 'user-001',
      title: 'Test Note',
      content: 'Content',
      folder_id: null,
      is_pinned: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      attachments: [],
      folder: null,
    };

    it('should activate for authorized user (note owner)', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: mockUser,
            resource: mockNote,
          }),
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should activate for authorized user (admin)', () => {
      const adminUser: JwtPayload = {
        ...mockUser,
        sub: 'admin-001',
        roles: ['admin'],
      };

      const otherUserNote: Note = {
        ...mockNote,
        user_id: 'user-002',
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: adminUser,
            resource: otherUserNote,
          }),
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should deny for unauthorized user (not owner, not admin)', () => {
      const otherUser: JwtPayload = {
        ...mockUser,
        sub: 'user-002',
        roles: ['user'],
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: otherUser,
            resource: mockNote,
          }),
        }),
      } as ExecutionContext;

      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
    });

    it('should throw ForbiddenException when resource is missing', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: mockUser,
            resource: null, // Missing resource
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Unable to verify resource ownership');
    });

    it('should throw ForbiddenException when user is missing', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: null, // Missing user
            resource: mockNote,
          }),
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow('Unable to verify resource ownership');
    });
  });
});
