import { z } from 'zod';

export const updateMerchantProfileSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  businessType: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
});

export const merchantSettingsSchema = z.object({
  defaultVehicleType: z.enum(['BODA', 'TUKTUK', 'MINIVAN']).optional(),
  defaultPaymentMethod: z.enum(['MPESA_STK', 'CASH_ON_DELIVERY', 'WALLET']).optional(),
  notifyOnPickup: z.boolean().optional(),
  notifyOnDelivery: z.boolean().optional(),
  notifyRecipientBySms: z.boolean().optional(),
  requirePhotoProof: z.boolean().optional(),
});

export const savedContactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  notes: z.string().max(200).optional(),
});

export type UpdateMerchantProfileDto = z.infer<typeof updateMerchantProfileSchema>;
export type MerchantSettingsDto = z.infer<typeof merchantSettingsSchema>;
export type SavedContactDto = z.infer<typeof savedContactSchema>;
