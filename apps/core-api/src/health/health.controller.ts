import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Health check - liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'core-api' },
        version: { type: 'string', example: '1.0.0' },
        timestamp: { type: 'string', example: '2025-10-29T10:00:00Z' },
      },
    },
  })
  health() {
    return {
      status: 'ok',
      service: 'core-api',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check - checks database connectivity' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        database: { type: 'string', example: 'connected' },
        timestamp: { type: 'string', example: '2025-10-29T10:00:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'not ready' },
        database: { type: 'string', example: 'disconnected' },
        timestamp: { type: 'string', example: '2025-10-29T10:00:00Z' },
      },
    },
  })
  async ready() {
    try {
      // Simple database connectivity check with 5 second timeout
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database timeout')), 5000),
        ),
      ]);

      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not ready',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
