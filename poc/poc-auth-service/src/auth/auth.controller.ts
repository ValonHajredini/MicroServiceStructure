import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginDto } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'HS256');
  }

  @Post('login/hs256')
  async loginHS256(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'HS256');
  }

  @Post('login/rs256')
  async loginRS256(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'RS256');
  }

  @Get('public-key')
  getPublicKey() {
    return {
      publicKey: this.authService.getTestPublicKey(),
      algorithm: 'RS256',
      usage: 'JWT signature verification',
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'poc-auth-service',
      timestamp: new Date().toISOString(),
    };
  }
}
