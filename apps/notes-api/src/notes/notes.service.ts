import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Note } from './entities/note.entity';
import { Attachment } from './entities/attachment.entity';
import { Folder } from '../folders/entities/folder.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FilesClientService } from '../files/files-client.service';
import { SearchResultDto, SearchResponse } from './dto/search-result.dto';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  folder_id?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchOptions {
  page?: number;
  limit?: number;
}

/**
 * Maximum pagination limit to prevent abuse
 * QA Fix: PERF-001 - Enforce maximum pagination limit
 */
const MAX_LIMIT = 100;

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepo: Repository<Note>,
    @InjectRepository(Attachment)
    private attachmentsRepo: Repository<Attachment>,
    @InjectRepository(Folder)
    private foldersRepo: Repository<Folder>,
    private filesClientService: FilesClientService,
  ) {}

  /**
   * Create a new note
   * AC: 1, 2 - Auto-assign tenant_id and user_id from JWT
   */
  async create(
    createNoteDto: CreateNoteDto,
    user: JwtPayload,
  ): Promise<Note> {
    const { folder_id, ...noteData } = createNoteDto;

    // Validate folder exists and belongs to tenant (if provided)
    if (folder_id) {
      const folder = await this.foldersRepo.findOne({
        where: {
          id: folder_id,
          tenant_id: user.tenantId,
        },
      });

      if (!folder) {
        throw new NotFoundException(
          `Folder ${folder_id} not found or does not belong to your tenant`,
        );
      }
    }

    // Create note with auto-assigned tenant_id and user_id
    const note = this.notesRepo.create({
      ...noteData,
      folder_id,
      tenant_id: user.tenantId,
      user_id: user.sub,
    });

    return this.notesRepo.save(note);
  }

  /**
   * Get paginated list of notes
   * AC: 3 - Filter by tenant, paginate, order by pinned and updated_at
   * QA Fix: PERF-001 - Enforce maximum pagination limit
   */
  async findAll(
    user: JwtPayload,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Note>> {
    const { page = 1, limit = 20, folder_id } = options;
    // Enforce maximum limit to prevent abuse
    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    const queryBuilder = this.notesRepo
      .createQueryBuilder('note')
      .where('note.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('note.deleted_at IS NULL');

    if (folder_id) {
      if (folder_id === 'root') {
        // Return notes with no folder
        queryBuilder.andWhere('note.folder_id IS NULL');
      } else {
        // Validate folder exists and belongs to tenant
        const folder = await this.foldersRepo.findOne({
          where: { id: folder_id, tenant_id: user.tenantId },
        });

        if (!folder) {
          throw new NotFoundException(
            `Folder ${folder_id} not found or does not belong to your tenant`,
          );
        }

        queryBuilder.andWhere('note.folder_id = :folder_id', { folder_id });
      }
    }

    const [notes, total] = await queryBuilder
      .orderBy('note.is_pinned', 'DESC')
      .addOrderBy('note.updated_at', 'DESC')
      .skip((page - 1) * effectiveLimit)
      .take(effectiveLimit)
      .getManyAndCount();

    return {
      data: notes,
      meta: {
        page,
        limit: effectiveLimit,
        total,
        totalPages: Math.ceil(total / effectiveLimit),
      },
    };
  }

  /**
   * Get single note with attachments and file metadata
   * Story 3.4 - AC: 3, 4 - Load attachments relationship with file metadata from Core Service
   * @param id - Note ID
   * @param user - JWT payload
   * @param token - Optional JWT token for Core Service calls (extracted from request header)
   */
  async findOne(
    id: string,
    user: JwtPayload,
    token?: string,
  ): Promise<any> {
    const note = await this.notesRepo.findOne({
      where: {
        id,
        tenant_id: user.tenantId,
        deleted_at: IsNull(),
      },
      relations: ['attachments'],
    });

    if (!note) {
      throw new NotFoundException(
        `Note ${id} not found or does not belong to your tenant`,
      );
    }

    // Filter out soft-deleted attachments
    if (note.attachments) {
      note.attachments = note.attachments.filter((a) => !a.deleted_at);
    }

    // If token provided, fetch file metadata for each attachment
    if (token && note.attachments && note.attachments.length > 0) {
      const enrichedAttachments = await Promise.all(
        note.attachments.map(async (attachment) => {
          try {
            const fileMetadata = await this.filesClientService.getFileMetadata(
              attachment.file_id,
              token,
            );

            return {
              id: attachment.id,
              file_id: attachment.file_id,
              filename: fileMetadata.filename,
              file_size: fileMetadata.file_size,
              mime_type: fileMetadata.mime_type,
              storage_url: fileMetadata.storage_url,
              created_at: attachment.created_at,
            };
          } catch (error) {
            // If file metadata unavailable, return partial data with error flag
            return {
              id: attachment.id,
              file_id: attachment.file_id,
              filename: 'File unavailable',
              file_size: 0,
              mime_type: 'unknown',
              storage_url: null,
              created_at: attachment.created_at,
              error: 'File metadata unavailable',
            };
          }
        }),
      );

      // Calculate total attachment size and count
      const attachmentTotalSize = enrichedAttachments
        .filter((a) => !a.error)
        .reduce((sum, a) => sum + a.file_size, 0);
      const attachmentCount = enrichedAttachments.length;

      return {
        ...note,
        attachments: enrichedAttachments,
        attachment_total_size: attachmentTotalSize,
        attachment_count: attachmentCount,
      };
    }

    return note;
  }

  /**
   * Update note
   * AC: 5, 7 - Partial update with authorization check
   */
  async update(
    id: string,
    updateNoteDto: UpdateNoteDto,
    user: JwtPayload,
  ): Promise<Note> {
    const note = await this.findOne(id, user);

    // Authorization check: note owner or admin
    if (!this.canModifyNote(note, user)) {
      throw new ForbiddenException('You can only modify your own notes');
    }

    const { folder_id, ...updateData } = updateNoteDto;

    // Validate folder exists and belongs to tenant (if changing folder)
    if (folder_id !== undefined) {
      if (folder_id === null) {
        // Explicitly setting to null to remove from folder
        updateData['folder_id'] = null;
      } else {
        const folder = await this.foldersRepo.findOne({
          where: {
            id: folder_id,
            tenant_id: user.tenantId,
          },
        });

        if (!folder) {
          throw new NotFoundException(
            `Folder ${folder_id} not found or does not belong to your tenant`,
          );
        }

        updateData['folder_id'] = folder_id;
      }
    }

    // Update only provided fields
    Object.assign(note, updateData);

    return this.notesRepo.save(note);
  }

  /**
   * Soft delete note
   * AC: 6, 7 - Soft delete note and attachments with authorization
   */
  async softDelete(id: string, user: JwtPayload): Promise<void> {
    const note = await this.findOne(id, user);

    // Authorization check: note owner or admin
    if (!this.canModifyNote(note, user)) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    // Soft delete note
    await this.notesRepo.update(id, { deleted_at: new Date() });

    // Soft delete all attachments
    await this.attachmentsRepo.update(
      { note_id: id },
      { deleted_at: new Date() },
    );
  }

  /**
   * Full-text search notes
   * Story 3.5 - Tasks 1, 4-11
   * AC: 1-7 - PostgreSQL full-text search with ranking, snippets, and pagination
   *
   * @param query - Search query string
   * @param tenantId - Tenant ID for filtering
   * @param options - Pagination options
   * @returns Paginated search results with snippets and relevance scores
   */
  async search(
    query: string,
    tenantId: string,
    options: SearchOptions,
  ): Promise<SearchResponse> {
    const { page = 1, limit = 20 } = options;

    // Task 10: Query Sanitization
    // Trim whitespace and validate query
    const sanitizedQuery = query.trim().replace(/\s+/g, ' ');

    if (!sanitizedQuery || sanitizedQuery.length < 1) {
      throw new BadRequestException('Search query cannot be empty');
    }

    if (sanitizedQuery.length > 255) {
      throw new BadRequestException(
        'Search query too long (max 255 characters)',
      );
    }

    // Check if query contains only special characters
    if (!/[a-zA-Z0-9]/.test(sanitizedQuery)) {
      throw new BadRequestException(
        'Search query must contain alphanumeric characters',
      );
    }

    // Enforce maximum limit (Task 8: Pagination)
    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    // Task 7: Build Full-Text Search Query with TypeORM
    // Task 4: PostgreSQL Full-Text Search
    // Task 5: Result Ranking with ts_rank
    // Task 6: Generate Search Snippets with ts_headline
    const queryBuilder = this.notesRepo
      .createQueryBuilder('note')
      .where('note.tenant_id = :tenantId', { tenantId })
      .andWhere('note.deleted_at IS NULL')
      .andWhere(
        "to_tsvector('english', note.title || ' ' || COALESCE(note.content, '')) @@ plainto_tsquery('english', :query)",
        { query: sanitizedQuery },
      );

    // Add rank calculation (Task 5: Result Ranking)
    queryBuilder
      .addSelect(
        "ts_rank(to_tsvector('english', note.title || ' ' || COALESCE(note.content, '')), plainto_tsquery('english', :query))",
        'rank',
      )
      // Add snippet generation (Task 6: Generate Search Snippets)
      .addSelect(
        "ts_headline('english', COALESCE(note.content, ''), plainto_tsquery('english', :query), 'MaxWords=50, MinWords=20, ShortWord=3, HighlightAll=FALSE')",
        'snippet',
      )
      // Order by relevance (rank DESC), then by updated_at DESC
      .orderBy('rank', 'DESC')
      .addOrderBy('note.updated_at', 'DESC');

    // Get total count for pagination (Task 8)
    const countQuery = queryBuilder.clone();
    const total = await countQuery.getCount();

    // Apply pagination (Task 8)
    const results = await queryBuilder
      .skip((page - 1) * effectiveLimit)
      .take(effectiveLimit)
      .getRawAndEntities();

    // Task 9: Handle Edge Cases - Build search results
    const searchResults: SearchResultDto[] = results.entities.map(
      (note, index) => ({
        id: note.id,
        title: note.title,
        snippet: results.raw[index].snippet || '',
        rank: parseFloat(results.raw[index].rank) || 0,
        folder_id: note.folder_id,
        is_pinned: note.is_pinned,
        updated_at: note.updated_at,
      }),
    );

    // Task 8: Return paginated response
    return {
      data: searchResults,
      meta: {
        query: sanitizedQuery,
        page,
        limit: effectiveLimit,
        total,
        totalPages: Math.ceil(total / effectiveLimit),
      },
    };
  }

  /**
   * Authorization helper
   * AC: 7 - Check if user can modify note (owner or admin)
   */
  canModifyNote(note: Note, user: JwtPayload): boolean {
    return note.user_id === user.sub || user.roles.includes('admin');
  }
}
