import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    [key: string]: any;
  };
}

/**
 * ResponseInterceptor
 * QA Fix: MAINT-001 - Extract response formatting to interceptor (DRY principle)
 *
 * Automatically wraps all controller responses in standard format:
 * {
 *   success: true,
 *   data: <controller return value>,
 *   meta: {
 *     timestamp: <ISO timestamp>,
 *     ...additional meta fields
 *   }
 * }
 *
 * Usage: Apply globally in main.ts or per controller with @UseInterceptors()
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data already has success field, it's already formatted
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Handle paginated responses (has data and meta fields)
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            data: data.data,
            meta: {
              ...data.meta,
              timestamp: new Date().toISOString(),
            },
          };
        }

        // Standard response format
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
