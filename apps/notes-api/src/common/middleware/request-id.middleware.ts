import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 * QA Fix: SEC-002 - Add request ID tracking for security audit trail
 *
 * Assigns a unique request ID to each incoming request for:
 * - Security monitoring and audit trails
 * - Debugging and error tracking
 * - Request correlation across distributed services
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing request ID from header
    const requestId = req.headers['x-request-id'] as string || randomUUID();

    // Attach to request object for use in controllers/services
    req['requestId'] = requestId;

    // Echo back in response headers for client tracking
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
