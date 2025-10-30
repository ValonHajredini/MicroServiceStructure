/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('File Upload Service (e2e)', () => {
  let app: INestApplication;

  // Test users
  const user1 = {
    email: 'user1@filesdemo.com',
    password: 'StrongPass123!',
  };

  const user2 = {
    email: 'user2@anothertenant.com',
    password: 'StrongPass123!',
  };

  let user1Token: string;
  let user1TenantId: string;
  let user2Token: string;
  let user2TenantId: string;

  beforeAll(async () => {
    // Set environment variables for tests
    process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    process.env.DB_DATABASE = 'microservice_test';

    // DigitalOcean Spaces configuration (will be mocked in service layer)
    process.env.DO_SPACES_ENDPOINT = 'https://nyc3.digitaloceanspaces.com';
    process.env.DO_SPACES_BUCKET = 'test-bucket';
    process.env.DO_SPACES_ACCESS_KEY = 'test-access-key';
    process.env.DO_SPACES_SECRET_KEY = 'test-secret-key';
    process.env.DO_SPACES_REGION = 'nyc3';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Register and authenticate test users
    const user1Response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: user1.email,
        password: user1.password,
        firstName: 'User',
        lastName: 'One',
      })
      .expect(201);

    user1Token = user1Response.body.data.token;
    user1TenantId = user1Response.body.data.user.tenantId;

    const user2Response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: user2.email,
        password: user2.password,
        firstName: 'User',
        lastName: 'Two',
      })
      .expect(201);

    user2Token = user2Response.body.data.token;
    user2TenantId = user2Response.body.data.user.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete File Upload Workflow', () => {
    let fileId: string;

    it('should create presigned URL for file upload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'test-document.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fileId');
      expect(response.body.data).toHaveProperty('uploadUrl');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data).toHaveProperty('storageKey');
      expect(response.body.data.metadata).toMatchObject({
        fileName: 'test-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        service: 'notes',
        status: 'pending',
      });

      // Verify storage key includes tenant ID
      expect(response.body.data.storageKey).toContain(user1TenantId);
      expect(response.body.data.storageKey).toContain('notes');

      fileId = response.body.data.fileId;
    });

    it('should confirm file upload after successful upload to Spaces', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/files/${fileId}/confirm`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: fileId,
        status: 'active',
      });
    });

    it('should retrieve file metadata and download URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: fileId,
        fileName: 'test-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        service: 'notes',
      });
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data.uploadedBy).toHaveProperty('id');
      expect(response.body.data.uploadedBy).toHaveProperty('email');
    });

    it('should delete file (soft delete + remove from Spaces)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: fileId,
        status: 'deleted',
      });
      expect(response.body.data).toHaveProperty('deletedAt');
    });

    it('should return 404 when trying to access deleted file', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    let tenant1FileId: string;

    beforeAll(async () => {
      // User 1 creates a file
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'private-document.pdf',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          targetService: 'kanban',
        })
        .expect(201);

      tenant1FileId = response.body.data.fileId;

      // Confirm the upload
      await request(app.getHttpServer())
        .patch(`/api/v1/files/${tenant1FileId}/confirm`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
    });

    it('should prevent user from different tenant from accessing file', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/files/${tenant1FileId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent user from different tenant from deleting file', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/files/${tenant1FileId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should prevent user from different tenant from confirming upload', async () => {
      // Create a new pending file for user 1
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'another-file.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(201);

      const newFileId = createResponse.body.data.fileId;

      // User 2 tries to confirm user 1's upload
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/files/${newFileId}/confirm`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Required', () => {
    it('should reject presigned URL request without token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .send({
          fileName: 'test.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(401);
    });

    it('should reject GET file without token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/files/some-file-id')
        .expect(401);
    });

    it('should reject DELETE file without token (401)', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/files/some-file-id')
        .expect(401);
    });

    it('should reject confirm upload without token (401)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/files/some-file-id/confirm')
        .expect(401);
    });

    it('should reject requests with invalid token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          fileName: 'test.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should reject request with missing fileName', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid file size (too large)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'huge-file.pdf',
          fileSize: 30 * 1024 * 1024, // 30MB (exceeds 25MB limit)
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid mime type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'malicious.exe',
          fileSize: 1024000,
          mimeType: 'application/x-msdownload', // Executable mime type
          targetService: 'notes',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid target service', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'test.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'invalid-service',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with empty fileName', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: '',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('File Name Sanitization', () => {
    it('should sanitize file names with special characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'test@#$%file!.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      // Storage key should have sanitized filename
      expect(response.body.data.storageKey).not.toContain('@');
      expect(response.body.data.storageKey).not.toContain('#');
      expect(response.body.data.storageKey).not.toContain('$');
    });

    it('should handle path traversal attempts in fileName', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: '../../etc/passwd',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      // Should not contain path traversal
      expect(response.body.data.storageKey).not.toContain('../');
    });
  });

  describe('Supported File Types', () => {
    it('should accept image files (JPEG)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'photo.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          targetService: 'kanban',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept image files (PNG)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'screenshot.png',
          fileSize: 1536000,
          mimeType: 'image/png',
          targetService: 'forms',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept document files (Word)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'report.docx',
          fileSize: 512000,
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          targetService: 'notes',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept ZIP archives', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'archive.zip',
          fileSize: 5120000,
          mimeType: 'application/zip',
          targetService: 'notes',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/files/non-existent-file-id')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should return 403 when non-owner tries to delete file', async () => {
      // Create file as user 1
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/files/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'protected.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          targetService: 'notes',
        })
        .expect(201);

      const fileId = createResponse.body.data.fileId;

      // Confirm upload
      await request(app.getHttpServer())
        .patch(`/api/v1/files/${fileId}/confirm`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Try to delete as user 2 (different tenant)
      await request(app.getHttpServer())
        .delete(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });
  });

  describe('Multiple Services', () => {
    it('should create files for different services in same tenant', async () => {
      const services = ['notes', 'kanban', 'forms'];

      for (const service of services) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/files/presigned-url')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            fileName: `${service}-file.pdf`,
            fileSize: 1024000,
            mimeType: 'application/pdf',
            targetService: service,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.metadata.service).toBe(service);
        expect(response.body.data.storageKey).toContain(service);
      }
    });
  });
});
