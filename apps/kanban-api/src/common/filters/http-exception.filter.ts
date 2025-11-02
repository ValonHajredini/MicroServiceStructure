import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let errors: any;

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === "object") {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || exception.message;
      errors = responseObj.errors || responseObj.message;
    } else {
      message = exception.message;
    }

    // Determine error code based on status
    let errorCode: string;
    switch (status) {
      case HttpStatus.NOT_FOUND:
        errorCode = "NOT_FOUND";
        break;
      case HttpStatus.FORBIDDEN:
        errorCode = "FORBIDDEN";
        break;
      case HttpStatus.BAD_REQUEST:
        errorCode = "VALIDATION_ERROR";
        break;
      case HttpStatus.UNAUTHORIZED:
        errorCode = "UNAUTHORIZED";
        break;
      default:
        errorCode = "INTERNAL_SERVER_ERROR";
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: Array.isArray(errors) ? errors.join(", ") : message,
        ...(Array.isArray(errors) && { details: errors }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}
