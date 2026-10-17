import { z } from 'zod';
import { kenyaPhoneSchema } from './phone';

export const initiateMpesaSchema = z.object({
  jobId: z.string().uuid(),
  phoneNumber: kenyaPhoneSchema,
  idempotencyKey: z.string().max(100).optional(),
});

export const codCollectionSchema = z.object({
  amount: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(5).max(500),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type InitiateMpesaDto = z.infer<typeof initiateMpesaSchema>;
export type CodCollectionDto = z.infer<typeof codCollectionSchema>;
export type RefundDto = z.infer<typeof refundSchema>;
export type PaginationDto = z.infer<typeof paginationSchema>;
