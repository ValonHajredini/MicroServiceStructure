import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import { NotesService, PaginationOptions } from './notes.service';
import { AttachmentsService } from './attachments.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { SearchNotesDto } from './dto/search-notes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * NotesController
 * Handles CRUD operations for notes with JWT authentication
 *
 * All endpoints:
 * - Require JWT authentication (JwtAuthGuard)
 * - Auto-scope to tenant from JWT
 * - Use standard response format
 */
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  /**
   * POST /api/v1/notes
   * Create a new note
   * AC: 1, 2
   * QA Fix: MAINT-001 - Response formatting handled by ResponseInterceptor
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createNoteDto: CreateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.create(createNoteDto, user);
  }

  /**
   * GET /api/v1/notes/search
   * Full-text search notes by title and content
   * Story 3.5 - Task 3
   * AC: 1, 3, 4, 6 - Search with pagination, tenant-scoped, exclude deleted
   */
  @Get('search')
  async search(
    @Query() searchDto: SearchNotesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.search(searchDto.q, user.tenantId, {
      page: searchDto.page,
      limit: searchDto.limit,
    });
  }

  /**
   * GET /api/v1/notes
   * Get paginated list of notes (tenant-scoped)
   * AC: 3
   * QA Fix: MAINT-001 - Response formatting handled by ResponseInterceptor
   */
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('folder_id') folder_id?: string,
  ) {
    const options: PaginationOptions = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      folder_id,
    };

    return this.notesService.findAll(user, options);
  }

  /**
   * GET /api/v1/notes/:id
   * Get single note with attachments and file metadata
   * Story 3.4 - AC: 3, 4
   * QA Fix: MAINT-001 - Response formatting handled by ResponseInterceptor
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') authHeader?: string,
  ) {
    // Extract token from "Bearer <token>" header for Core Service calls
    const token = authHeader?.replace('Bearer ', '');
    return this.notesService.findOne(id, user, token);
  }

  /**
   * PATCH /api/v1/notes/:id
   * Update note (owner or admin only)
   * AC: 5, 7
   * QA Fix: MAINT-001 - Response formatting handled by ResponseInterceptor
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notesService.update(id, updateNoteDto, user);
  }

  /**
   * DELETE /api/v1/notes/:id
   * Soft delete note (owner or admin only)
   * AC: 6, 7
   * QA Fix: MAINT-001 - Response formatting handled by ResponseInterceptor
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.notesService.softDelete(id, user);

    return {
      message: 'Note deleted successfully',
    };
  }

  /**
   * POST /api/v1/notes/:id/attachments
   * Add file attachment to note
   * Story 3.4 - AC: 1, 2, 5, 7
   */
  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  async addAttachment(
    @Param('id', ParseUUIDPipe) noteId: string,
    @Body() createAttachmentDto: CreateAttachmentDto,
    @CurrentUser() user: JwtPayload,
    @Headers('authorization') authHeader: string,
  ) {
    // Extract token from "Bearer <token>" header
    const token = authHeader?.replace('Bearer ', '');

    return this.attachmentsService.create(
      noteId,
      createAttachmentDto.file_id,
      user,
      token,
    );
  }

  /**
   * DELETE /api/v1/notes/:id/attachments/:attachmentId
   * Remove attachment from note
   * Story 3.4 - AC: 4, 7
   */
  @Delete(':id/attachments/:attachmentId')
  async removeAttachment(
    @Param('id', ParseUUIDPipe) noteId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.attachmentsService.delete(noteId, attachmentId, user);

    return {
      message: 'Attachment removed successfully',
    };
  }
}
