import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

export const ZodBody = (schema: ZodSchema) =>
  createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body;

    const result = schema.safeParse(body);
    if (result.success) return result.data;

    const details = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));

    throw new BadRequestException({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    });
  })(schema);
