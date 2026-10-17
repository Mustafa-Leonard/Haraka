import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor(private readonly config: ConfigService) {
    const isPretty = config.get<boolean>('LOG_PRETTY', false);
    const level = config.get<string>('LOG_LEVEL', 'info');

    this.logger = pino({
      level,
      ...(isPretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
      redact: {
        paths: [
          'phone', 'nationalId', 'password', 'otp', 'pin',
          '*.phone', '*.nationalId', '*.password', '*.otp', '*.pin',
          'req.headers.authorization', 'req.headers.cookie',
          'body.password', 'body.code', 'body.pin',
        ],
        censor: '[REDACTED]',
      },
    });
  }

  log(message: string, ...optionalParams: unknown[]) {
    this.logger.info(this.formatParams(optionalParams), message);
  }

  error(message: string, ...optionalParams: unknown[]) {
    this.logger.error(this.formatParams(optionalParams), message);
  }

  warn(message: string, ...optionalParams: unknown[]) {
    this.logger.warn(this.formatParams(optionalParams), message);
  }

  debug(message: string, ...optionalParams: unknown[]) {
    this.logger.debug(this.formatParams(optionalParams), message);
  }

  verbose(message: string, ...optionalParams: unknown[]) {
    this.logger.trace(this.formatParams(optionalParams), message);
  }

  private formatParams(params: unknown[]): Record<string, unknown> {
    if (params.length === 0) return {};
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
      return params[0] as Record<string, unknown>;
    }
    return { context: params };
  }
}
