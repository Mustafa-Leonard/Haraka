import { z } from 'zod';

/**
 * Validates and normalizes Kenyan phone numbers to E.164 format (+254XXXXXXXXX).
 * Accepts: +254XXXXXXXXX, 0XXXXXXXXX, 254XXXXXXXXX
 */
export function normalizeKenyanPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, '');

  if (/^\+254[17]\d{8}$/.test(cleaned)) return cleaned;
  if (/^0[17]\d{8}$/.test(cleaned)) return '+254' + cleaned.slice(1);
  if (/^254[17]\d{8}$/.test(cleaned)) return '+' + cleaned;

  return null;
}

export const kenyaPhoneSchema = z
  .string()
  .min(10, 'Phone number too short')
  .max(15, 'Phone number too long')
  .transform((val, ctx) => {
    const normalized = normalizeKenyanPhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid Kenyan phone number (e.g. 0712 345 678 or +254 712 345 678)',
      });
      return z.NEVER;
    }
    return normalized;
  });

export type KenyaPhone = z.infer<typeof kenyaPhoneSchema>;
