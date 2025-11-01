import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from './interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user object from valid JWT payload', async () => {
    const payload: JwtPayload = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      roles: ['user'],
      enabledServices: ['notes'],
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      roles: ['user'],
      enabledServices: ['notes'],
    });
  });

  it('should throw UnauthorizedException when sub is missing', async () => {
    const payload: any = {
      email: 'test@example.com',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      roles: ['user'],
    };

    try {
      await strategy.validate(payload);
      fail('Should have thrown UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
    }
  });

  it('should throw UnauthorizedException when tenantId is missing', async () => {
    const payload: any = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      roles: ['user'],
    };

    try {
      await strategy.validate(payload);
      fail('Should have thrown UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
    }
  });

  it('should throw UnauthorizedException with correct message', async () => {
    const payload: any = {
      email: 'test@example.com',
    };

    try {
      await strategy.validate(payload);
      fail('Should have thrown UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).toBe('Invalid JWT payload');
    }
  });
});
