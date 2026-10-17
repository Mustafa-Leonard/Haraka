import { z } from 'zod';
import { kenyaPhoneSchema } from './phone';

export const otpRequestSchema = z.object({
  phone: kenyaPhoneSchema,
  purpose: z.enum(['auth', 'phone_verify']).optional().default('auth'),
});

export const otpVerifySchema = z.object({
  phone: kenyaPhoneSchema,
  code: z.string().min(4).max(8).regex(/^\d+$/, 'OTP must be numeric'),
  purpose: z.enum(['auth', 'phone_verify']).optional().default('auth'),
});

export const totpVerifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, 'TOTP must be 6 digits'),
});

export const recoveryCodeSchema = z.object({
  code: z.string().min(8).max(32),
});

export type OtpRequestDto = z.infer<typeof otpRequestSchema>;
export type OtpVerifyDto = z.infer<typeof otpVerifySchema>;
export type TotpVerifyDto = z.infer<typeof totpVerifySchema>;
