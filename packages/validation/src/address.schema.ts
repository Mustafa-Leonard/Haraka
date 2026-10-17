import { z } from 'zod';

const VALID_TOWNS = ['Kilifi', 'Malindi', 'Mombasa'] as const;

export const createAddressSchema = z.object({
  label: z.string().max(100).optional(),
  street: z.string().min(3).max(300),
  building: z.string().max(200).optional(),
  area: z.string().min(2).max(100),
  town: z.string().min(2).max(100),
  instructions: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressDto = z.infer<typeof createAddressSchema>;
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>;
