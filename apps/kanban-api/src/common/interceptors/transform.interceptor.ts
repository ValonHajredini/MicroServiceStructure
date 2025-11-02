import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Handle paginated responses
        if (
          data &&
          typeof data === "object" &&
          "data" in data &&
          "total" in data
        ) {
          const { data: items, total, page, limit } = data;
          const totalPages = Math.ceil(total / (limit || 20));

          return {
            success: true,
            data: items,
            meta: {
              timestamp: new Date().toISOString(),
              pagination: {
                page: page || 1,
                limit: limit || 20,
                total,
                totalPages,
              },
            },
          } as Response<T>;
        }

        // Handle regular responses
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        } as Response<T>;
      }),
    );
  }
}
