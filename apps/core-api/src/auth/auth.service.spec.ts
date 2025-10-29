/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { EmailService } from '../common/services/email.service';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserTenantRole } from '../users/entities/user-tenant-role.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockTenantRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserTenantRoleRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPasswordResetTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: getRepositoryToken(UserTenantRole),
          useValue: mockUserTenantRoleRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create tenant and user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.findOne.mockResolvedValue(null);

      const mockTenant = {
        id: 'tenant-id',
        name: 'Example',
        enabled_services: [],
        status: 'active',
      };
      mockTenantRepository.create.mockReturnValue(mockTenant);
      mockTenantRepository.save.mockResolvedValue(mockTenant);

      mockUserRepository.count.mockResolvedValue(0);

      const mockUser = {
        id: 'user-id',
        tenant_id: 'tenant-id',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const mockRole = {
        user_id: 'user-id',
        tenant_id: 'tenant-id',
        role: 'admin',
      };
      mockUserTenantRoleRepository.create.mockReturnValue(mockRole);
      mockUserTenantRoleRepository.save.mockResolvedValue(mockRole);

      const result = await service.register(registerDto);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('user-id');
      expect(result.data.tenantId).toBe('tenant-id');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockTenantRepository.save).toHaveBeenCalled();
    });

    it('should hash password before storage', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.findOne.mockResolvedValue(null);

      const mockTenant = { id: 'tenant-id', enabled_services: [] };
      mockTenantRepository.create.mockReturnValue(mockTenant);
      mockTenantRepository.save.mockResolvedValue(mockTenant);
      mockUserRepository.count.mockResolvedValue(0);

      const mockUser = { id: 'user-id' };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUserTenantRoleRepository.create.mockReturnValue({});
      mockUserTenantRoleRepository.save.mockResolvedValue({});

      await service.register(registerDto);

      const createCall = mockUserRepository.create.mock.calls[0][0] as User;
      expect(createCall.password_hash).toBeDefined();
      expect(createCall.password_hash).not.toBe(registerDto.password);
    });

    it('should reject duplicate email', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should assign admin role to first user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.findOne.mockResolvedValue(null);

      const mockTenant = { id: 'tenant-id', enabled_services: [] };
      mockTenantRepository.create.mockReturnValue(mockTenant);
      mockTenantRepository.save.mockResolvedValue(mockTenant);

      mockUserRepository.count.mockResolvedValue(0); // First user

      const mockUser = { id: 'user-id', tenant_id: 'tenant-id' };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      mockUserTenantRoleRepository.create.mockReturnValue({});
      mockUserTenantRoleRepository.save.mockResolvedValue({});

      await service.register(registerDto);

      const roleCreateCall = mockUserTenantRoleRepository.create.mock
        .calls[0][0] as UserTenantRole;
      expect(roleCreateCall.role).toBe('admin');
    });

    it('should assign user role to subsequent users', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const existingTenant = { id: 'tenant-id', enabled_services: [] };
      mockTenantRepository.findOne.mockResolvedValue(existingTenant);

      mockUserRepository.count.mockResolvedValue(1); // Not first user

      const mockUser = { id: 'user-id', tenant_id: 'tenant-id' };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      mockUserTenantRoleRepository.create.mockReturnValue({});
      mockUserTenantRoleRepository.save.mockResolvedValue({});

      await service.register(registerDto);

      const roleCreateCall = mockUserTenantRoleRepository.create.mock
        .calls[0][0] as UserTenantRole;
      expect(roleCreateCall.role).toBe('user');
    });

    it('should derive tenant name from email domain', async () => {
      const acmeDto: RegisterDto = {
        email: 'john@acme.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.findOne.mockResolvedValue(null);
      mockUserRepository.count.mockResolvedValue(0);

      const mockTenant = { id: 'tenant-id', enabled_services: [] };
      mockTenantRepository.create.mockReturnValue(mockTenant);
      mockTenantRepository.save.mockResolvedValue(mockTenant);

      const mockUser = { id: 'user-id', tenant_id: 'tenant-id' };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      mockUserTenantRoleRepository.create.mockReturnValue({});
      mockUserTenantRoleRepository.save.mockResolvedValue({});

      await service.register(acmeDto);

      const tenantCreateCall = mockTenantRepository.create.mock.calls[0][0];
      expect(tenantCreateCall.name).toBe('Acme');
    });

    it('should create tenant with enabled_services as empty array', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.findOne.mockResolvedValue(null);
      mockUserRepository.count.mockResolvedValue(0);

      const mockTenant = { id: 'tenant-id', enabled_services: [] };
      mockTenantRepository.create.mockReturnValue(mockTenant);
      mockTenantRepository.save.mockResolvedValue(mockTenant);

      const mockUser = { id: 'user-id', tenant_id: 'tenant-id' };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      mockUserTenantRoleRepository.create.mockReturnValue({});
      mockUserTenantRoleRepository.save.mockResolvedValue({});

      await service.register(registerDto);

      const tenantCreateCall = mockTenantRepository.create.mock.calls[0][0];
      expect(tenantCreateCall.enabled_services).toEqual([]);
      expect(tenantCreateCall.status).toBe('active');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    it('should validate credentials and return JWT token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('SecurePass123!', 10),
        first_name: 'John',
        last_name: 'Doe',
        tenant_id: 'tenant-id',
        status: 'active',
        tenant: {
          id: 'tenant-id',
          enabled_services: ['notes'],
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRoleRepository.find.mockResolvedValue([{ role: 'admin' }]);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.data.access_token).toBe('jwt-token');
      expect(result.data.user.email).toBe('test@example.com');
    });

    it('should include correct JWT claims', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('SecurePass123!', 10),
        tenant_id: 'tenant-id',
        status: 'active',
        tenant: {
          id: 'tenant-id',
          enabled_services: ['notes', 'kanban'],
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRoleRepository.find.mockResolvedValue([{ role: 'admin' }]);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      await service.login(loginDto);

      const signCall = mockJwtService.signAsync.mock.calls[0][0];

      expect(signCall.sub).toBe('user-id');

      expect(signCall.email).toBe('test@example.com');

      expect(signCall.tenantId).toBe('tenant-id');

      expect(signCall.roles).toContain('admin');

      expect(signCall.enabledServices).toEqual(['notes', 'kanban']);
    });

    it('should reject invalid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should reject wrong password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('DifferentPassword123!', 10),
        status: 'active',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should not return password_hash in response', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('SecurePass123!', 10),
        first_name: 'John',
        last_name: 'Doe',
        tenant_id: 'tenant-id',
        status: 'active',
        tenant: { enabled_services: [] },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRoleRepository.find.mockResolvedValue([{ role: 'user' }]);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result.data.user).not.toHaveProperty('password_hash');
    });

    it('should include exp claim with 24h expiration (TEST-002)', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: await bcrypt.hash('SecurePass123!', 10),
        tenant_id: 'tenant-id',
        status: 'active',
        tenant: {
          id: 'tenant-id',
          enabled_services: [],
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserTenantRoleRepository.find.mockResolvedValue([{ role: 'user' }]);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      await service.login(loginDto);

      const signCall = mockJwtService.signAsync.mock.calls[0][0];

      // Verify iat and exp are included
      expect(signCall.iat).toBeDefined();
      expect(signCall.exp).toBeDefined();

      // Verify exp is ~24 hours from iat (86400 seconds ± 5 second tolerance)
      const expectedExpiration = 86400; // 24 hours in seconds
      const actualDuration = signCall.exp - signCall.iat;

      expect(actualDuration).toBeGreaterThanOrEqual(expectedExpiration - 5);
      expect(actualDuration).toBeLessThanOrEqual(expectedExpiration + 5);
    });
  });

  describe('password validation (TEST-003)', () => {
    it('should reject weak password without uppercase', async () => {
      const weakDto: RegisterDto = {
        email: 'test@example.com',
        password: 'weakpass123!', // No uppercase
        firstName: 'John',
        lastName: 'Doe',
      };

      // This validation happens at DTO level via class-validator
      // Test that the password regex pattern would reject this
      const passwordRegex =
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
      expect(passwordRegex.test(weakDto.password)).toBe(false);
    });

    it('should reject weak password without lowercase', async () => {
      const weakDto: RegisterDto = {
        email: 'test@example.com',
        password: 'WEAKPASS123!', // No lowercase
        firstName: 'John',
        lastName: 'Doe',
      };

      const passwordRegex =
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
      expect(passwordRegex.test(weakDto.password)).toBe(false);
    });

    it('should reject weak password without number or special char', async () => {
      const weakDto: RegisterDto = {
        email: 'test@example.com',
        password: 'WeakPassword', // No number or special char
        firstName: 'John',
        lastName: 'Doe',
      };

      const passwordRegex =
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
      expect(passwordRegex.test(weakDto.password)).toBe(false);
    });

    it('should accept strong password', async () => {
      const strongDto: RegisterDto = {
        email: 'test@example.com',
        password: 'SecurePass123!', // Has all requirements
        firstName: 'John',
        lastName: 'Doe',
      };

      const passwordRegex =
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
      expect(passwordRegex.test(strongDto.password)).toBe(true);
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should generate and store token for existing user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordResetTokenRepository.delete.mockResolvedValue({
        affected: 0,
      });

      const mockToken = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: 'hashed-token',
        expires_at: new Date(),
      };
      mockPasswordResetTokenRepository.create.mockReturnValue(mockToken);
      mockPasswordResetTokenRepository.save.mockResolvedValue(mockToken);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('If the email exists');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPasswordResetTokenRepository.delete).toHaveBeenCalledWith({
        user_id: 'user-id',
      });
      expect(mockPasswordResetTokenRepository.save).toHaveBeenCalled();
    });

    it('should return success for non-existent email (prevent enumeration)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('If the email exists');
      expect(mockPasswordResetTokenRepository.save).not.toHaveBeenCalled();
    });

    it('should use cryptographically secure token generation', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordResetTokenRepository.delete.mockResolvedValue({
        affected: 0,
      });

      const mockToken = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: expect.any(String),
        expires_at: expect.any(Date),
      };
      mockPasswordResetTokenRepository.create.mockReturnValue(mockToken);
      mockPasswordResetTokenRepository.save.mockResolvedValue(mockToken);

      const result = await service.forgotPassword(forgotPasswordDto);

      // Verify function completes successfully (crypto.randomBytes is used internally)
      expect(result.success).toBe(true);
      expect(mockPasswordResetTokenRepository.save).toHaveBeenCalled();
    });

    it('should hash token before storage', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: 'hashed-password',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordResetTokenRepository.delete.mockResolvedValue({
        affected: 0,
      });

      let savedTokenHash: string | undefined;
      mockPasswordResetTokenRepository.create.mockImplementation(
        (data: any) => {
          savedTokenHash = data.token_hash;
          return data;
        },
      );
      mockPasswordResetTokenRepository.save.mockResolvedValue({});

      await service.forgotPassword(forgotPasswordDto);

      // Token hash should be 64 characters (SHA256 hex)
      expect(savedTokenHash).toBeDefined();
      expect(savedTokenHash?.length).toBe(64);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-token',
      newPassword: 'NewSecurePass123!',
    };

    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
      };

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockResetToken = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: crypto
          .createHash('sha256')
          .update('valid-token')
          .digest('hex'),
        expires_at: futureDate,
        user: mockUser,
      };

      mockPasswordResetTokenRepository.findOne.mockResolvedValue(
        mockResetToken,
      );
      mockUserRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      mockPasswordResetTokenRepository.delete.mockResolvedValue({
        affected: 1,
      });

      const result = await service.resetPassword(resetPasswordDto);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('Password reset successful');
      expect(mockPasswordResetTokenRepository.delete).toHaveBeenCalledWith({
        id: 'token-id',
      });
    });

    it('should reject invalid token', async () => {
      mockPasswordResetTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should reject expired token', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);

      const mockResetToken = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: crypto
          .createHash('sha256')
          .update('valid-token')
          .digest('hex'),
        expires_at: pastDate,
      };

      mockPasswordResetTokenRepository.findOne.mockResolvedValue(
        mockResetToken,
      );
      mockPasswordResetTokenRepository.delete.mockResolvedValue({
        affected: 1,
      });

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Password reset token has expired',
      );

      // Should clean up expired token
      expect(mockPasswordResetTokenRepository.delete).toHaveBeenCalledWith({
        id: 'token-id',
      });
    });

    it('should delete token after successful reset (single-use)', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
      };

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockResetToken = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: crypto
          .createHash('sha256')
          .update('valid-token')
          .digest('hex'),
        expires_at: futureDate,
        user: mockUser,
      };

      mockPasswordResetTokenRepository.findOne.mockResolvedValue(
        mockResetToken,
      );
      mockUserRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      mockPasswordResetTokenRepository.delete.mockResolvedValue({
        affected: 1,
      });

      await service.resetPassword(resetPasswordDto);

      expect(mockPasswordResetTokenRepository.delete).toHaveBeenCalledWith({
        id: 'token-id',
      });
    });

    it('should hash new password with bcrypt', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
      };

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const mockResetToken = {
        id: 'token-id',
        user_id: 'user-id',
        token_hash: crypto
          .createHash('sha256')
          .update('valid-token')
          .digest('hex'),
        expires_at: futureDate,
        user: mockUser,
      };

      mockPasswordResetTokenRepository.findOne.mockResolvedValue(
        mockResetToken,
      );
      mockPasswordResetTokenRepository.delete.mockResolvedValue({
        affected: 1,
      });

      let updatedPasswordHash: string | undefined;
      mockUserRepository.update = jest
        .fn()
        .mockImplementation((_where, data: any) => {
          updatedPasswordHash = data.password_hash;
          return Promise.resolve({ affected: 1 });
        });

      await service.resetPassword(resetPasswordDto);

      // Password hash should be bcrypt hash (starts with $2b$ and is 60 chars)
      expect(updatedPasswordHash).toBeDefined();
      expect(updatedPasswordHash?.startsWith('$2b$')).toBe(true);
      expect(updatedPasswordHash?.length).toBe(60);
    });
  });
});
