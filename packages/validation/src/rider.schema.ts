import { z } from 'zod';

export const riderAvailabilitySchema = z.object({
  online: z.boolean(),
});

export const registerVehicleSchema = z.object({
  type: z.enum(['BODA', 'TUKTUK', 'MINIVAN']),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
  plateNumber: z.string().min(4).max(20).transform((v) => v.toUpperCase()),
  color: z.string().max(50).optional(),
});

export const riderVerificationRejectionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const offerResponseSchema = z.object({
  declineReason: z.string().max(300).optional(),
});

export const disputeReportSchema = z.object({
  category: z.string().min(2).max(50),
  description: z.string().min(10).max(2000),
});

export const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type RiderAvailabilityDto = z.infer<typeof riderAvailabilitySchema>;
export type RegisterVehicleDto = z.infer<typeof registerVehicleSchema>;
export type OfferResponseDto = z.infer<typeof offerResponseSchema>;
export type RatingDto = z.infer<typeof ratingSchema>;
