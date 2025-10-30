import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInvitationDto } from '../invitations/dto/accept-invitation.dto';
import { InvitationsService } from '../invitations/invitations.service';

/**
 * Authentication Controller
 *
 * Rate limiting implemented with @nestjs/throttler:
 * - Login: 5 requests per 15 minutes per IP (SEC-001 fixed)
 * - Register: 5 requests per 15 minutes per IP (SEC-001 fixed)
 * - Forgot-password: 5 requests per 15 minutes per IP (SEC-001 fixed)
 * - Reset-password: 5 requests per 15 minutes per IP
 * - Default limit for other endpoints: 10 requests per minute per IP
 *
 * TODO (Phase 2): Consider additional per-email-address rate limiting
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes (SEC-001)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes (SEC-001)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes (SEC-001)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'If email exists, password reset link has been sent',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('register-with-invite')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
  @ApiOperation({
    summary: 'Register with invitation token',
    description:
      'Complete registration using an invitation token. Creates user account and assigns role from invitation.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered with invitation',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired invitation token',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async registerWithInvite(@Body() acceptDto: AcceptInvitationDto) {
    // Validate invitation token
    const invitation = await this.invitationsService.getInvitationByToken(
      acceptDto.token,
    );

    // Register user with invitation details
    const result = await this.authService.registerWithInvite(
      acceptDto,
      invitation,
    );

    // Mark invitation as accepted
    await this.invitationsService.markInvitationAsAccepted(acceptDto.token);

    return result;
  }
}
