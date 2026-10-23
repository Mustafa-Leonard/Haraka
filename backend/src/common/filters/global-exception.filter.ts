import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = (request?.headers?.['x-request-id'] as string) ?? 'req-' + Math.random().toString(36).substring(2, 9);
    const isDev = this.config.get<string>('NODE_ENV', 'development') === 'development';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as Record<string, unknown>;

      if (typeof body === 'object' && body !== null) {
        errorCode = (body['error'] as string) ?? this.statusToCode(status);
        message = (body['message'] as string) ?? exception.message;
        details = body['details'] as unknown[] | undefined;
      } else {
        message = String(body);
        errorCode = this.statusToCode(status);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unhandled non-Error exception', exception);
    }

    const payload: Record<string, unknown> = {
      statusCode: status,
      error: errorCode,
      message,
      requestId,
    };

    if (details) payload['details'] = details;

    if (isDev && exception instanceof Error) {
      payload['stack'] = exception.stack;
    }

    if (response && typeof response.status === 'function') {
      response.status(status).send(payload);
    }
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'INVALID_STATE',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
