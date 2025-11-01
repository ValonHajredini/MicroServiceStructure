import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserTenantRole } from '../users/entities/user-tenant-role.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInvitationDto } from '../invitations/dto/accept-invitation.dto';
import { Invitation } from '../invitations/entities/invitation.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenantRole)
    private readonly userTenantRoleRepository: Repository<UserTenantRole>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { companyName, email, password, firstName, lastName } = registerDto;

    // Check for duplicate email across all tenants
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const password_hash = await this.hashPassword(password);

    // Create or find tenant for this user
    // For first user, create new tenant using provided company name
    let tenant = await this.tenantRepository.findOne({
      where: { name: companyName },
    });

    if (!tenant) {
      tenant = this.tenantRepository.create({
        name: companyName,
        enabled_services: [],
        status: 'active',
      });
      tenant = await this.tenantRepository.save(tenant);
    }

    // Check if this is the first user in the tenant
    const existingUsersCount = await this.userRepository.count({
      where: { tenant_id: tenant.id },
    });
    const isFirstUser = existingUsersCount === 0;

    // Create user
    const user = this.userRepository.create({
      tenant_id: tenant.id,
      email: email.toLowerCase(),
      password_hash,
      first_name: firstName,
      last_name: lastName,
      status: 'active',
    });

    const savedUser = await this.userRepository.save(user);

    // Create user-tenant role
    const role = isFirstUser ? 'admin' : 'user';
    const userTenantRole = this.userTenantRoleRepository.create({
      user_id: savedUser.id,
      tenant_id: tenant.id,
      role,
    });

    await this.userTenantRoleRepository.save(userTenantRole);

    // Get user roles
    const userRoles = await this.userTenantRoleRepository.find({
      where: {
        user_id: savedUser.id,
        tenant_id: tenant.id,
      },
    });

    const roles = userRoles.map((ur) => ur.role);

    // Generate JWT token
    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      tenantId: savedUser.tenant_id,
      roles,
      enabledServices: tenant.enabled_services,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
    });

    // Return success response with JWT token and user data
    return {
      success: true,
      data: {
        token: access_token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.first_name,
          lastName: savedUser.last_name,
          tenantId: savedUser.tenant_id,
          roles,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email with tenant and roles
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['tenant'],
    });

    if (!user) {
      // Generic error message to prevent user enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.validatePassword(
      password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Get user roles
    const userRoles = await this.userTenantRoleRepository.find({
      where: {
        user_id: user.id,
        tenant_id: user.tenant_id,
      },
    });

    const roles = userRoles.map((ur) => ur.role);

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      roles,
      enabledServices: user.tenant.enabled_services,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
    });

    // Return success response (no password_hash)
    return {
      success: true,
      data: {
        token: access_token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          tenantId: user.tenant_id,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user by email (silently fail to prevent email enumeration)
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Always return success, even if email not found (security)
    if (!user) {
      return {
        success: true,
        data: {
          message: 'If the email exists, a password reset link has been sent',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Generate cryptographically secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Hash token before storing (SHA256)
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    // Delete any existing tokens for this user (invalidate old requests)
    await this.passwordResetTokenRepository.delete({ user_id: user.id });

    // Calculate expiration (1 hour from now)
    const expirationHours = parseInt(
      process.env.PASSWORD_RESET_EXPIRATION_HOURS || '1',
      10,
    );
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + expirationHours);

    // Store hashed token with expiration
    const resetToken = this.passwordResetTokenRepository.create({
      user_id: user.id,
      token_hash,
      expires_at,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return {
      success: true,
      data: {
        message: 'If the email exists, a password reset link has been sent',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Hash the incoming token to compare with stored hash
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token record with user relation
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token_hash },
      relations: ['user'],
    });

    // Validate token exists
    if (!resetToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Validate token not expired
    const now = new Date();
    if (resetToken.expires_at < now) {
      // Clean up expired token
      await this.passwordResetTokenRepository.delete({ id: resetToken.id });
      throw new BadRequestException(
        'Password reset token has expired. Please request a new one.',
      );
    }

    // Hash new password
    const password_hash = await this.hashPassword(newPassword);

    // Update user password
    await this.userRepository.update(
      { id: resetToken.user_id },
      { password_hash },
    );

    // Invalidate token (delete it - single use)
    await this.passwordResetTokenRepository.delete({ id: resetToken.id });

    // Log password reset for security monitoring
    console.log(`Password reset successful for user: ${resetToken.user_id}`);

    return {
      success: true,
      data: {
        message:
          'Password reset successful. Please login with your new password.',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Optional: Cleanup expired tokens (can be called by scheduled job)
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.passwordResetTokenRepository.delete({
      expires_at: LessThan(now),
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    return bcrypt.hash(password, saltRounds);
  }

  private async validatePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async registerWithInvite(
    acceptDto: AcceptInvitationDto,
    invitation: Invitation,
  ) {
    const { firstName, lastName, password } = acceptDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: invitation.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const password_hash = await this.hashPassword(password);

    // Create user
    const user = this.userRepository.create({
      tenant_id: invitation.tenant_id,
      email: invitation.email.toLowerCase(),
      password_hash,
      first_name: firstName,
      last_name: lastName,
      status: 'active',
    });

    const savedUser = await this.userRepository.save(user);

    // Create user-tenant role with role from invitation
    const userTenantRole = this.userTenantRoleRepository.create({
      user_id: savedUser.id,
      tenant_id: invitation.tenant_id,
      role: invitation.role,
    });

    await this.userTenantRoleRepository.save(userTenantRole);

    // Get tenant for JWT
    const tenant = await this.tenantRepository.findOne({
      where: { id: invitation.tenant_id },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Get user roles
    const userRoles = await this.userTenantRoleRepository.find({
      where: {
        user_id: savedUser.id,
        tenant_id: invitation.tenant_id,
      },
    });

    const roles = userRoles.map((ur) => ur.role);

    // Generate JWT token
    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      tenantId: savedUser.tenant_id,
      roles,
      enabledServices: tenant.enabled_services,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
    });

    // Return success response with JWT token and user data
    return {
      success: true,
      data: {
        token: access_token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.first_name,
          lastName: savedUser.last_name,
          tenantId: savedUser.tenant_id,
          roles,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
