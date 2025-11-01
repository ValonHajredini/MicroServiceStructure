import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Note } from '../entities/note.entity';
import { BaseTenantRepository } from '../../common/repositories/base-tenant.repository';

/**
 * Repository for Note entities with automatic tenant isolation
 *
 * All queries are automatically scoped to the current tenant.
 * Extends BaseTenantRepository to inherit tenant-safe CRUD operations.
 */
@Injectable({ scope: Scope.REQUEST })
export class NotesRepository extends BaseTenantRepository<Note> {
  constructor(
    @InjectRepository(Note)
    repository: Repository<Note>,
    @Inject(REQUEST) request: Request,
  ) {
    super(repository, request);
  }

  /**
   * Find all notes for a specific folder
   */
  async findByFolder(folderId: string | null): Promise<Note[]> {
    return this.find({
      where: { folder_id: folderId } as any,
      relations: ['folder', 'attachments'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find all pinned notes
   */
  async findPinned(): Promise<Note[]> {
    return this.find({
      where: { is_pinned: true } as any,
      relations: ['folder'],
      order: { updated_at: 'DESC' },
    });
  }

  /**
   * Find notes by user
   */
  async findByUser(userId: string): Promise<Note[]> {
    return this.find({
      where: { user_id: userId } as any,
      relations: ['folder'],
      order: { updated_at: 'DESC' },
    });
  }

  /**
   * Full-text search on note title and content
   * Uses PostgreSQL full-text search with GIN index
   */
  async search(searchTerm: string): Promise<Note[]> {
    const alias = 'note';
    return this.createQueryBuilder(alias)
      .leftJoinAndSelect(`${alias}.folder`, 'folder')
      .where(`to_tsvector('english', ${alias}.title || ' ' || ${alias}.content) @@ plainto_tsquery('english', :searchTerm)`, {
        searchTerm,
      })
      .orderBy(`${alias}.updated_at`, 'DESC')
      .getMany();
  }

  /**
   * Soft delete note (sets deleted_at timestamp)
   */
  async softDeleteNote(noteId: string): Promise<void> {
    await this.softDelete(noteId);
  }
}
