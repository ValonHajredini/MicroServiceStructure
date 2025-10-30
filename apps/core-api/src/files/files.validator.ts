import { Injectable, BadRequestException } from '@nestjs/common';
import { FILE_CONSTRAINTS } from '../common/constants/file-constraints';

@Injectable()
export class FilesValidator {
  /**
   * Validate file size
   */
  validateFileSize(fileSize: number): void {
    if (fileSize <= 0) {
      throw new BadRequestException('File size must be greater than 0');
    }

    if (fileSize > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${FILE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Validate mime type against whitelist
   */
  validateMimeType(mimeType: string): void {
    if (!FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        'File type not supported. Allowed types: images, PDFs, documents, text files, and archives',
      );
    }
  }

  /**
   * Validate service name
   */
  validateService(service: string): void {
    const validServices: readonly string[] = FILE_CONSTRAINTS.VALID_SERVICES;
    if (!validServices.includes(service)) {
      throw new BadRequestException(
        `Invalid service name. Must be: ${FILE_CONSTRAINTS.VALID_SERVICES.join(', ')}`,
      );
    }
  }

  /**
   * Sanitize file name (remove special characters, limit length)
   */
  sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    const baseName = fileName.replace(/^.*[\\/]/, '');

    // Remove special characters except dots, dashes, underscores
    const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length to 200 characters
    return sanitized.substring(0, 200);
  }

  /**
   * Validate all file constraints
   */
  validateFile(
    fileName: string,
    fileSize: number,
    mimeType: string,
    service: string,
  ): string {
    this.validateFileSize(fileSize);
    this.validateMimeType(mimeType);
    this.validateService(service);

    return this.sanitizeFileName(fileName);
  }
}
