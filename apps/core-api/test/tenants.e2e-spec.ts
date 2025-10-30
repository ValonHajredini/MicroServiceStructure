/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tenant Management (e2e)', () => {
  let app: INestApplication;

  // Test data for multiple users and tenants
  const adminUser = {
    email: 'admin@acme.com',
    password: 'StrongPass123!',
  };

  const regularUser = {
    email: 'user@acme.com',
    password: 'StrongPass123!',
  };

  const otherTenantUser = {
    email: 'admin@different.com',
    password: 'StrongPass123!',
  };

  let adminToken: string;
  let adminTenantId: string;
  let regularUserToken: string;
  let otherTenantToken: string;
  let otherTenantId: string;

  beforeAll(async () => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    process.env.DB_DATABASE = 'microservice_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Tenant Management Flow', () => {
    it('should register admin user and auto-create tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: adminUser.email,
          password: adminUser.password,
          firstName: 'Admin',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({
        email: adminUser.email,
        firstName: 'Admin',
        lastName: 'User',
      });
      expect(response.body.data.user.tenantId).toBeDefined();

      // Save admin token and tenant ID for later tests
      adminToken = response.body.data.token;
      adminTenantId = response.body.data.user.tenantId;
    });

    it('should login as admin and retrieve token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: adminUser.email,
          password: adminUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      adminToken = response.body.data.token;
    });

    it('should GET tenant details as admin user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: adminTenantId,
        name: expect.any(String),
        enabled_services: [],
        status: 'active',
      });
      expect(response.body.data.name).toBe('Acme'); // Derived from email domain
    });

    it('should PATCH tenant name as admin user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Acme Industries',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Acme Industries');
      expect(response.body.data.id).toBe(adminTenantId);
    });

    it('should verify tenant name was updated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.name).toBe('Acme Industries');
    });
  });

  describe('Non-Admin Access Control', () => {
    beforeAll(async () => {
      // Register a second user in the same tenant (should get 'user' role)
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: regularUser.email,
          password: regularUser.password,
          firstName: 'Regular',
          lastName: 'User',
        })
        .expect(201);

      regularUserToken = response.body.data.token;
    });

    it('should reject GET /tenants/:id for non-admin user (403)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject PATCH /tenants/:id for non-admin user (403)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    beforeAll(async () => {
      // Register a user in a different tenant
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: otherTenantUser.email,
          password: otherTenantUser.password,
          firstName: 'Other',
          lastName: 'Admin',
        })
        .expect(201);

      otherTenantToken = response.body.data.token;
      otherTenantId = response.body.data.user.tenantId;
    });

    it('should prevent Tenant A admin from accessing Tenant B (403)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${otherTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should prevent Tenant B admin from accessing Tenant A (403)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${otherTenantToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should prevent Tenant A admin from updating Tenant B (403)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${otherTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Hacked Tenant Name',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Required', () => {
    it('should reject GET /tenants/:id without token (401)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${adminTenantId}`)
        .expect(401);
    });

    it('should reject PATCH /tenants/:id without token (401)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .send({ name: 'New Name' })
        .expect(401);
    });

    it('should reject requests with invalid token (401)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should reject PATCH with empty name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject PATCH with name longer than 255 characters', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'A'.repeat(256),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject PATCH with invalid subdomain format', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subdomain: 'Invalid_Subdomain!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Protected Fields', () => {
    it('should not allow updating enabled_services via PATCH', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          enabled_services: ['notes', 'kanban'], // Attempt to hack protected field
        })
        .expect(200);

      // Verify enabled_services was NOT updated (still empty)
      expect(response.body.data.enabled_services).toEqual([]);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should not allow updating status via PATCH', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${adminTenantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Another Update',
          status: 'suspended', // Attempt to hack protected field
        })
        .expect(200);

      // Verify status was NOT updated (still 'active')
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.name).toBe('Another Update');
    });
  });
});
