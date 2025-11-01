import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, retry, timeout, catchError } from 'rxjs';

export interface FileMetadata {
  id: string;
  tenant_id?: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
}

/**
 * FilesClientService
 * HTTP client for calling Core Service file endpoints
 * AC: 4 - Fetch file metadata for attachments
 * QA Fix: REL-001 - Added timeout and retry logic for resilience
 */
@Injectable()
export class FilesClientService {
  private readonly coreServiceUrl: string;
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_RETRIES = 3; // Retry up to 3 times
  private readonly RETRY_DELAY = 1000; // 1 second between retries

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.coreServiceUrl =
      this.configService.get<string>('CORE_SERVICE_URL') ||
      'http://localhost:3000';
  }

  /**
   * Get file metadata from Core Service
   * QA Fix: REL-001 - Added timeout and retry logic for resilience
   * @param fileId - UUID of the file
   * @param token - JWT token for authentication
   * @returns File metadata (id, filename, file_size, mime_type, storage_url)
   */
  async getFileMetadata(
    fileId: string,
    token: string,
  ): Promise<FileMetadata> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.coreServiceUrl}/api/v1/files/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: this.REQUEST_TIMEOUT,
          })
          .pipe(
            // Add timeout to prevent hanging requests
            timeout(this.REQUEST_TIMEOUT),
            // Retry transient failures (network errors, 5xx) up to MAX_RETRIES times
            retry({
              count: this.MAX_RETRIES,
              delay: this.RETRY_DELAY,
              resetOnSuccess: true,
            }),
          ),
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException(`File ${fileId} not found`);
      }
      throw new ServiceUnavailableException(
        'Core Service unavailable: ' + error.message,
      );
    }
  }

  /**
   * Validate file ownership (belongs to tenant)
   * Story 3.4 - Task 8 - AC: 3
   * @param fileId - UUID of the file
   * @param tenantId - Tenant ID to validate against
   * @param token - JWT token for authentication
   * @returns True if file belongs to tenant
   */
  async validateFileOwnership(
    fileId: string,
    tenantId: string,
    token: string,
  ): Promise<boolean> {
    const file = await this.getFileMetadata(fileId, token);
    return file.tenant_id === tenantId;
  }

  /**
   * Get multiple file metadata in batch
   * Story 3.4 - Task 8 - AC: 3
   * Optimized for performance when fetching multiple attachments
   * @param fileIds - Array of file UUIDs
   * @param token - JWT token for authentication
   * @returns Array of file metadata
   */
  async getMultipleFileMetadata(
    fileIds: string[],
    token: string,
  ): Promise<FileMetadata[]> {
    // Batch fetch for performance
    const promises = fileIds.map((id) => this.getFileMetadata(id, token));
    return Promise.all(promises);
  }
}
