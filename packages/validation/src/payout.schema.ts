import { z } from 'zod';

export const payoutRequestSchema = z.object({
  amount: z.number().int().positive().refine(Number.isSafeInteger, 'Amount must be a safe integer in KES minor units'),
});

export type PayoutRequestDto = z.infer<typeof payoutRequestSchema>;
