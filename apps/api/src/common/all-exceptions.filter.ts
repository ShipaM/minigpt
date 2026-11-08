import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ErrorResponse } from '@minigpt/contracts';

// Minimal request/response shapes: we do not pull in express types for two fields.
interface HttpRequestLike {
  url: string;
  method: string;
}

interface HttpResponseLike {
  status(code: number): { json(body: unknown): void };
}

/** Turns any error into the single ErrorResponse format and never leaks internals on 5xx. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<HttpRequestLike>();
    const res = http.getResponse<HttpResponseLike>();

    const body = this.toBody(exception, req.url);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, path: string): ErrorResponse {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      const payload = typeof raw === 'string' ? { message: raw } : (raw as Record<string, unknown>);
      const message = payload['message'];
      const error = typeof payload['error'] === 'string' ? payload['error'] : exception.name;

      if (Array.isArray(message)) {
        return {
          statusCode,
          error,
          message: 'Validation failed',
          details: message.map(String),
          path,
          timestamp,
        };
      }
      return {
        statusCode,
        error,
        message: typeof message === 'string' ? message : exception.message,
        path,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
      path,
      timestamp,
    };
  }
}
