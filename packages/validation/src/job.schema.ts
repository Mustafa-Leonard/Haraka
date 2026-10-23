import { z } from 'zod';
import { kenyaPhoneSchema } from './phone';

export const vehicleTypeSchema = z.enum(['BODA', 'TUKTUK', 'MINIVAN']);
export const parcelSizeSchema = z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']);
export const paymentMethodSchema = z.enum(['MPESA_STK', 'CASH_ON_DELIVERY', 'WALLET']);

export const quoteRequestSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  vehicleType: vehicleTypeSchema,
  parcelSize: parcelSizeSchema,
  zoneSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export const addressSnapshotSchema = z.object({
  street: z.string().min(3).max(300),
  building: z.string().max(200).optional(),
  area: z.string().min(2).max(100),
  town: z.string().min(2).max(100),
  instructions: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createJobSchema = z.object({
  quoteId: z.string().uuid(),
  // Pickup
  pickupAddressId: z.string().uuid().optional(),
  pickupStreet: z.string().min(3).max(300),
  pickupBuilding: z.string().max(200).optional(),
  pickupArea: z.string().min(2).max(100),
  pickupTown: z.string().min(2).max(100),
  pickupInstructions: z.string().max(500).optional(),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  // Dropoff
  dropoffAddressId: z.string().uuid().optional(),
  dropoffStreet: z.string().min(3).max(300),
  dropoffBuilding: z.string().max(200).optional(),
  dropoffArea: z.string().min(2).max(100),
  dropoffTown: z.string().min(2).max(100),
  dropoffInstructions: z.string().max(500).optional(),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  // Recipient
  recipientName: z.string().min(2).max(100),
  recipientPhone: kenyaPhoneSchema,
  // Parcel
  vehicleType: vehicleTypeSchema,
  parcelSize: parcelSizeSchema,
  parcelDescription: z.string().max(300).optional(),
  isFragile: z.boolean().optional().default(false),
  // Payment
  paymentMethod: paymentMethodSchema,
  // Idempotency
  idempotencyKey: z.string().max(100).optional(),
});

export const cancelJobSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  altitude: z.number().optional(),
  recordedAt: z.string().datetime(),
});

export const verifyPickupSchema = z.object({
  pin: z.string().min(4).max(8).regex(/^\d+$/, 'PIN must be numeric'),
});

export const verifyDeliverySchema = z.object({
  pin: z.string().min(4).max(8).regex(/^\d+$/, 'PIN must be numeric'),
});

export type QuoteRequestDto = z.infer<typeof quoteRequestSchema>;
export type CreateJobDto = z.infer<typeof createJobSchema>;
export type LocationUpdateDto = z.infer<typeof locationUpdateSchema>;
export type VerifyPickupDto = z.infer<typeof verifyPickupSchema>;
export type VerifyDeliveryDto = z.infer<typeof verifyDeliverySchema>;
