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
import { FilesClientService } from '../files/files-client.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * AttachmentsService
 * Business logic for managing file attachments on notes
 * AC: 1-4, 6, 7 from Story 3.4
 */
@Injectable()
export class AttachmentsService {
  private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
  private readonly MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB in bytes

  constructor(
    @InjectRepository(Note)
    private notesRepo: Repository<Note>,
    @InjectRepository(Attachment)
    private attachmentsRepo: Repository<Attachment>,
    private filesClientService: FilesClientService,
  ) {}

  /**
   * Create a new attachment for a note
   * AC: 1, 2, 5, 7
   * @param noteId - UUID of the note
   * @param fileId - UUID of the file from Core Service
   * @param user - JWT payload with tenant and user info
   * @param token - JWT token for calling Core Service
   */
  async create(
    noteId: string,
    fileId: string,
    user: JwtPayload,
    token: string,
  ): Promise<Attachment> {
    // Verify note exists and belongs to tenant
    const note = await this.notesRepo.findOne({
      where: {
        id: noteId,
        tenant_id: user.tenantId,
        deleted_at: IsNull(),
      },
    });

    if (!note) {
      throw new NotFoundException(
        `Note ${noteId} not found or does not belong to your tenant`,
      );
    }

    // Authorization check: note owner or admin
    if (note.user_id !== user.sub && !user.roles.includes('admin')) {
      throw new ForbiddenException(
        'You can only add attachments to your own notes',
      );
    }

    // Get file metadata from Core Service and validate
    const fileMetadata = await this.filesClientService.getFileMetadata(
      fileId,
      token,
    );

    // Verify file belongs to same tenant
    if (fileMetadata['tenant_id'] !== user.tenantId) {
      throw new ForbiddenException(
        'File does not belong to your tenant',
      );
    }

    // Validate file size limits
    await this.validateAttachmentSize(noteId, fileMetadata.file_size, token);

    // Create attachment record
    const attachment = this.attachmentsRepo.create({
      tenant_id: user.tenantId,
      note_id: noteId,
      file_id: fileId,
    });

    return this.attachmentsRepo.save(attachment);
  }

  /**
   * Find all active attachments for a note
   * AC: 3, 9
   * @param noteId - UUID of the note
   */
  async findByNote(noteId: string): Promise<Attachment[]> {
    return this.attachmentsRepo.find({
      where: {
        note_id: noteId,
        deleted_at: IsNull(),
      },
      order: {
        created_at: 'ASC',
      },
    });
  }

  /**
   * Delete an attachment
   * AC: 4, 7
   * @param noteId - UUID of the note
   * @param attachmentId - UUID of the attachment
   * @param user - JWT payload with tenant and user info
   */
  async delete(
    noteId: string,
    attachmentId: string,
    user: JwtPayload,
  ): Promise<void> {
    // Verify note exists and belongs to tenant
    const note = await this.notesRepo.findOne({
      where: {
        id: noteId,
        tenant_id: user.tenantId,
        deleted_at: IsNull(),
      },
    });

    if (!note) {
      throw new NotFoundException(
        `Note ${noteId} not found or does not belong to your tenant`,
      );
    }

    // Authorization check: note owner or admin
    if (note.user_id !== user.sub && !user.roles.includes('admin')) {
      throw new ForbiddenException(
        'You can only delete attachments from your own notes',
      );
    }

    // Verify attachment exists and belongs to note
    const attachment = await this.attachmentsRepo.findOne({
      where: {
        id: attachmentId,
        note_id: noteId,
      },
    });

    if (!attachment) {
      throw new NotFoundException(
        `Attachment ${attachmentId} not found on note ${noteId}`,
      );
    }

    // Hard delete attachment record (do NOT delete file from Core Service)
    await this.attachmentsRepo.delete(attachmentId);
  }

  /**
   * Validate attachment size constraints
   * AC: 5 - Enforce 25MB per file and 100MB total per note
   * @param noteId - UUID of the note
   * @param newFileSize - Size of the new file in bytes
   * @param token - JWT token for calling Core Service
   */
  async validateAttachmentSize(
    noteId: string,
    newFileSize: number,
    token: string,
  ): Promise<void> {
    // Check individual file size
    if (newFileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds 25MB limit. File size: ${(newFileSize / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // Get all existing attachments for note
    const attachments = await this.attachmentsRepo.find({
      where: {
        note_id: noteId,
        deleted_at: IsNull(),
      },
    });

    // Fetch file sizes from Core Service
    let currentTotalSize = 0;
    for (const attachment of attachments) {
      try {
        const fileMetadata = await this.filesClientService.getFileMetadata(
          attachment.file_id,
          token,
        );
        currentTotalSize += fileMetadata.file_size;
      } catch (error) {
        // If file metadata unavailable, skip it (file might be deleted)
        continue;
      }
    }

    // Calculate new total size
    const newTotalSize = currentTotalSize + newFileSize;

    if (newTotalSize > this.MAX_TOTAL_SIZE) {
      throw new BadRequestException(
        `Total attachment size would exceed 100MB limit. ` +
          `Current: ${(currentTotalSize / 1024 / 1024).toFixed(2)}MB, ` +
          `New file: ${(newFileSize / 1024 / 1024).toFixed(2)}MB, ` +
          `Total: ${(newTotalSize / 1024 / 1024).toFixed(2)}MB`,
      );
    }
  }
}
