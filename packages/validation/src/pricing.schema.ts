import { z } from 'zod';

const positiveMinorUnits = z.number().int().positive();
const nonNegativeMinorUnits = z.number().int().min(0);

export const parcelMultiplierSchema = z.object({
  parcelSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
  multiplier: z.number().min(0.5).max(10),
});

export const updatePricingRuleSchema = z.object({
  baseFare: positiveMinorUnits.optional(),
  perKmRate: positiveMinorUnits.optional(),
  minimumFare: positiveMinorUnits.optional(),
  parcelMultipliers: z.array(parcelMultiplierSchema).optional(),
  notes: z.string().max(500).optional(),
});

export const createServiceZoneSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().max(500).optional(),
});

export type UpdatePricingRuleDto = z.infer<typeof updatePricingRuleSchema>;
export type CreateServiceZoneDto = z.infer<typeof createServiceZoneSchema>;
