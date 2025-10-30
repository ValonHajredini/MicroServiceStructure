import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileMetadata } from './entities/file-metadata.entity';
import { StorageService } from './storage.service';
import { FilesValidator } from './files.validator';
import {
  PresignedUrlResponseDto,
  FileDownloadResponseDto,
  FileDeleteResponseDto,
  FileConfirmResponseDto,
  FileMetadataDto,
} from './dto/file-response.dto';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileMetadata)
    private fileMetadataRepository: Repository<FileMetadata>,
    private storageService: StorageService,
    private filesValidator: FilesValidator,
  ) {}

  /**
   * Generate presigned URL for file upload
   */
  async createPresignedUrl(
    dto: CreatePresignedUrlDto,
    userId: string,
    tenantId: string,
  ): Promise<PresignedUrlResponseDto> {
    // Validate file constraints
    const sanitizedFileName = this.filesValidator.validateFile(
      dto.fileName,
      dto.fileSize,
      dto.mimeType,
      dto.targetService,
    );

    // Generate unique file ID
    const fileId = uuidv4();

    // Construct storage key: {tenantId}/{service}/{fileId}/{sanitizedFileName}
    const storageKey = `${tenantId}/${dto.targetService}/${fileId}/${sanitizedFileName}`;

    // Generate presigned upload URL
    const uploadUrl = await this.storageService.generateUploadUrl(
      storageKey,
      dto.mimeType,
      tenantId,
      userId,
    );

    // Create file metadata record with status 'pending'
    const fileMetadata = this.fileMetadataRepository.create({
      id: fileId,
      tenantId,
      uploadedByUserId: userId,
      filename: sanitizedFileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      storageKey,
      service: dto.targetService,
      status: 'pending',
    });

    await this.fileMetadataRepository.save(fileMetadata);

    this.logger.log(
      `Presigned URL generated for file ${fileId} by user ${userId} in tenant ${tenantId}`,
    );

    // Calculate expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      fileId,
      uploadUrl,
      expiresAt,
      storageKey,
      metadata: this.mapToMetadataDto(fileMetadata),
    };
  }

  /**
   * Get file metadata and generate download URL
   */
  async getFile(
    fileId: string,
    userId: string,
    tenantId: string,
  ): Promise<FileDownloadResponseDto> {
    const file = await this.fileMetadataRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user has access to file (tenant_id matches)
    if (file.tenantId !== tenantId) {
      throw new ForbiddenException(
        "You don't have permission to access this file",
      );
    }

    // Check if file is deleted
    if (file.status === 'deleted') {
      throw new NotFoundException('File not found or has been deleted');
    }

    // Generate presigned download URL
    const downloadUrl = await this.storageService.generateDownloadUrl(
      file.storageKey,
    );

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      id: file.id,
      fileName: file.filename,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      service: file.service,
      downloadUrl,
      expiresAt,
      createdAt: file.createdAt,
      uploadedBy: {
        id: file.uploadedByUserId,
      },
    };
  }

  /**
   * Delete file (soft delete + remove from storage)
   */
  async deleteFile(
    fileId: string,
    userId: string,
    tenantId: string,
    isAdmin: boolean = false,
  ): Promise<FileDeleteResponseDto> {
    const file = await this.fileMetadataRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user has access to file
    if (file.tenantId !== tenantId) {
      throw new ForbiddenException(
        "You don't have permission to delete this file",
      );
    }

    // Verify user owns file or is admin
    if (file.uploadedByUserId !== userId && !isAdmin) {
      throw new ForbiddenException('Only file owner or admin can delete files');
    }

    // Check if already deleted
    if (file.status === 'deleted') {
      throw new NotFoundException('File has already been deleted');
    }

    // Soft delete in database
    const deletedAt = new Date();
    await this.fileMetadataRepository.update(fileId, {
      status: 'deleted',
      deletedAt,
    });

    // Delete from DigitalOcean Spaces
    try {
      await this.storageService.deleteFile(file.storageKey);
    } catch (error) {
      this.logger.error(
        `Failed to delete file from storage: ${file.storageKey}`,
        error,
      );
      // Continue even if storage deletion fails - file is soft deleted
    }

    this.logger.log(
      `File ${fileId} deleted by user ${userId} in tenant ${tenantId}`,
    );

    return {
      id: fileId,
      status: 'deleted',
      deletedAt,
    };
  }

  /**
   * Confirm file upload (update status from pending to active)
   */
  async confirmUpload(
    fileId: string,
    userId: string,
    tenantId: string,
  ): Promise<FileConfirmResponseDto> {
    const file = await this.fileMetadataRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user has access to file
    if (file.tenantId !== tenantId) {
      throw new ForbiddenException(
        "You don't have permission to confirm this file",
      );
    }

    // Verify user owns file
    if (file.uploadedByUserId !== userId) {
      throw new ForbiddenException('Only file owner can confirm upload');
    }

    // Update status to active
    await this.fileMetadataRepository.update(fileId, {
      status: 'active',
    });

    this.logger.log(
      `File ${fileId} confirmed by user ${userId} in tenant ${tenantId}`,
    );

    return {
      id: fileId,
      status: 'active',
    };
  }

  /**
   * Map FileMetadata entity to DTO
   */
  private mapToMetadataDto(file: FileMetadata): FileMetadataDto {
    return {
      id: file.id,
      fileName: file.filename,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      service: file.service,
      status: file.status,
      createdAt: file.createdAt,
    };
  }
}
