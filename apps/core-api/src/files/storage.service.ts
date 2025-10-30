import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FILE_CONSTRAINTS } from '../common/constants/file-constraints';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('DO_SPACES_ENDPOINT', '');
    const region = this.configService.get<string>('DO_SPACES_REGION', '');
    const accessKeyId = this.configService.get<string>(
      'DO_SPACES_ACCESS_KEY',
      '',
    );
    const secretAccessKey = this.configService.get<string>(
      'DO_SPACES_SECRET_KEY',
      '',
    );
    this.bucket = this.configService.get<string>('DO_SPACES_BUCKET', '') || '';

    if (
      !endpoint ||
      !region ||
      !accessKeyId ||
      !secretAccessKey ||
      !this.bucket
    ) {
      this.logger.warn(
        'DigitalOcean Spaces configuration incomplete. File upload will not work.',
      );
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('DigitalOcean Spaces client initialized');
  }

  /**
   * Generate presigned URL for uploading a file
   */
  async generateUploadUrl(
    storageKey: string,
    mimeType: string,
    tenantId: string,
    userId: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
      Metadata: {
        'tenant-id': tenantId,
        'uploaded-by': userId,
      },
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: FILE_CONSTRAINTS.UPLOAD_EXPIRATION,
    });
  }

  /**
   * Generate presigned URL for downloading a file
   */
  async generateDownloadUrl(storageKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: FILE_CONSTRAINTS.DOWNLOAD_EXPIRATION,
    });
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    await this.s3Client.send(command);
    this.logger.log(`File deleted from storage: ${storageKey}`);
  }

  /**
   * Test connection to Spaces bucket
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to generate a simple presigned URL to test connection
      const testKey = 'test-connection';
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: testKey,
      });
      await getSignedUrl(this.s3Client, command, { expiresIn: 60 });
      this.logger.log('Successfully connected to DigitalOcean Spaces');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to DigitalOcean Spaces', error);
      return false;
    }
  }
}
