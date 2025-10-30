import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordResetToken } from '../src/auth/entities/password-reset-token.entity';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

describe('Auth E2E Tests', () => {
  let app: INestApplication<App>;
  let passwordResetTokenRepository: Repository<PasswordResetToken>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Get repository for password reset token tests
    passwordResetTokenRepository = moduleFixture.get<
      Repository<PasswordResetToken>
    >(getRepositoryToken(PasswordResetToken));

    // Apply same validation pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Full Registration → Login Flow (TEST-001)', () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const registerData = {
      email: uniqueEmail,
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should complete full registration and login flow', async () => {
      // Step 1: Register a new user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.userId).toBeDefined();
      expect(registerResponse.body.data.tenantId).toBeDefined();

      const { userId, tenantId } = registerResponse.body.data;

      // Step 2: Login with registered credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.access_token).toBeDefined();
      expect(loginResponse.body.data.user).toBeDefined();
      expect(loginResponse.body.data.user.email).toBe(
        uniqueEmail.toLowerCase(),
      );
      expect(loginResponse.body.data.user.id).toBe(userId);

      // Step 3: Decode and verify JWT claims
      const token = loginResponse.body.data.access_token;
      const decoded = jwt.decode(token) as any;

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(userId);
      expect(decoded.email).toBe(uniqueEmail.toLowerCase());
      expect(decoded.tenantId).toBe(tenantId);
      expect(decoded.roles).toContain('admin'); // First user gets admin
      expect(decoded.enabledServices).toBeDefined();
      expect(Array.isArray(decoded.enabledServices)).toBe(true);

      // Verify no password in response
      expect(loginResponse.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject duplicate email registration', async () => {
      // Try to register with the same email again
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(409);
    });

    it('should reject login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('Password Reset Flow (TEST-001)', () => {
    const uniqueEmail = `reset-${Date.now()}@example.com`;
    const initialPassword = 'InitialPass123!';
    const newPassword = 'NewSecurePass456!';

    it('should complete full password reset flow: forgot → reset → login', async () => {
      // Step 1: Register a user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: initialPassword,
          firstName: 'Reset',
          lastName: 'Test',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const userId = registerResponse.body.data.userId;

      // Step 2: Verify initial password works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: initialPassword,
        })
        .expect(200);

      // Step 3: Request password reset
      const forgotResponse = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: uniqueEmail })
        .expect(200);

      expect(forgotResponse.body.success).toBe(true);
      expect(forgotResponse.body.data.message).toContain(
        'reset link has been sent',
      );

      // Step 4: Get the reset token from database (simulating getting it from email)
      // In production, user would get this from email link
      const tokenRecord = await passwordResetTokenRepository.findOne({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
      });

      expect(tokenRecord).toBeDefined();
      expect(tokenRecord).not.toBeNull();
      if (tokenRecord) {
        expect(tokenRecord.expires_at.getTime()).toBeGreaterThan(Date.now());
      }

      // Generate the same token that was stored (we need the unhashed version)
      // Note: In production, this would come from the email link
      // For testing, we'll use a workaround by generating a valid token
      // Since tokens are hashed, we need to use the AuthService's token generation
      // For this test, we'll request another reset to get a fresh token

      // Actually, let's use the token_hash to verify, but we need the raw token
      // The service generates a token with crypto.randomBytes and hashes it with SHA256
      // For testing purposes, we'll need to either:
      // 1. Mock the email service to capture the token
      // 2. Create a test endpoint to get the token
      // 3. Use a fixed token in test mode

      // For this integration test, let's verify the token exists in DB
      // and then generate a new valid token by making another request
      // This tests the real flow without needing to extract from email mock

      const testToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(testToken)
        .digest('hex');

      // Update the token in DB with our known token for testing
      await passwordResetTokenRepository.update(
        { user_id: userId },
        { token_hash: hashedToken },
      );

      // Step 5: Reset password with token
      const resetResponse = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: testToken,
          newPassword: newPassword,
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.data.message).toContain(
        'Password reset successful',
      );

      // Step 6: Verify old password no longer works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: initialPassword,
        })
        .expect(401);

      // Step 7: Verify new password works
      const newLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: newPassword,
        })
        .expect(200);

      expect(newLoginResponse.body.success).toBe(true);
      expect(newLoginResponse.body.data.access_token).toBeDefined();

      // Step 8: Verify token was deleted (single-use)
      const deletedToken = await passwordResetTokenRepository.findOne({
        where: { user_id: userId },
      });
      expect(deletedToken).toBeNull();
    });

    it('should reject reset with expired token', async () => {
      const expiredEmail = `expired-${Date.now()}@example.com`;

      // Register user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: expiredEmail,
          password: initialPassword,
          firstName: 'Expired',
          lastName: 'Test',
        })
        .expect(201);

      // Request password reset
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: expiredEmail })
        .expect(200);

      // Create an expired token manually
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const hashedExpiredToken = crypto
        .createHash('sha256')
        .update(expiredToken)
        .digest('hex');

      const user = await passwordResetTokenRepository
        .createQueryBuilder('token')
        .leftJoinAndSelect('token.user', 'user')
        .where('user.email = :email', { email: expiredEmail })
        .getOne();

      // Update token to be expired (1 hour ago)
      const expiredDate = new Date(Date.now() - 60 * 60 * 1000);
      if (user && user.user) {
        await passwordResetTokenRepository.update(
          { user_id: user.user.id },
          {
            token_hash: hashedExpiredToken,
            expires_at: expiredDate,
          },
        );
      }

      // Try to reset with expired token
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: newPassword,
        })
        .expect(400);
    });

    it('should handle forgot-password rate limiting', async () => {
      const rateLimitEmail = `ratelimit-${Date.now()}@example.com`;

      // Register user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: rateLimitEmail,
          password: initialPassword,
          firstName: 'Rate',
          lastName: 'Limit',
        })
        .expect(201);

      // Make 5 requests (should succeed)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: rateLimitEmail })
          .expect(200);
      }

      // 6th request should be rate limited
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: rateLimitEmail })
        .expect(429); // Too Many Requests
    });
  });
});
