import { z } from 'zod';
import { kenyaPhoneSchema } from './phone';
import { STAFF_PORTAL_ROLES } from '@haraka/shared-types';

const commonPasswords = new Set([
  '12345678',
  'password',
  'password1',
  'password123',
  'qwerty123',
  'admin123',
  'letmein123',
  'welcome123',
  'iloveyou',
  'monkey123',
]);

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((password) => !commonPasswords.has(password.toLowerCase()), {
    message: 'Choose a less common password.',
  });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    phone: kenyaPhoneSchema,
    role: z.enum(['MERCHANT', 'RIDER']),
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const passwordLoginSchema = z.object({
  phone: kenyaPhoneSchema,
  password: z.string().min(1).max(128),
  role: z.enum(['MERCHANT', 'RIDER', ...STAFF_PORTAL_ROLES]).optional(),
});

export const passwordResetRequestSchema = z.object({
  phone: kenyaPhoneSchema,
});

export const emailActionRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});

export const passwordResetOtpSchema = z.object({
  phone: kenyaPhoneSchema,
  code: z.string().length(6).regex(/^\d+$/, 'OTP must be numeric'),
  password: passwordSchema,
});

export const passwordResetEmailSchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
});

export const emailTokenSchema = z.object({
  token: z.string().min(32).max(128),
});

export const totpVerifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, 'TOTP must be 6 digits'),
});

export const staffMfaChallengeSchema = z.object({
  challengeToken: z
    .string()
    .length(43)
    .regex(/^[A-Za-z0-9_-]+$/),
});

export const staffMfaVerifySchema = staffMfaChallengeSchema.extend({
  code: z.string().length(6).regex(/^\d+$/, 'TOTP must be 6 digits'),
});

export const recoveryCodeSchema = z.object({
  code: z.string().min(8).max(32),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type PasswordLoginDto = z.infer<typeof passwordLoginSchema>;
export type TotpVerifyDto = z.infer<typeof totpVerifySchema>;
