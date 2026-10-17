import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    return value;
  }
}

export function validateWithZod<T>(schema: ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
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
}
