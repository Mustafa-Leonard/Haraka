import { describe, it, expect } from 'vitest';

// ── Kenya Phone Normalizer (mirrors packages/validation/src/phone.ts) ─────

function normalizeKenyaPhone(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, '').replace(/-/g, '');

  if (/^\+2547\d{8}$/.test(cleaned)) return cleaned;
  if (/^\+2541\d{8}$/.test(cleaned)) return cleaned;
  if (/^2547\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^2541\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^07\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  if (/^01\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  if (/^7\d{8}$/.test(cleaned)) return `+254${cleaned}`;
  if (/^1\d{8}$/.test(cleaned)) return `+254${cleaned}`;

  return null; // invalid
}

describe('Kenya Phone Normalizer', () => {
  describe('valid numbers — all formats normalize to E.164', () => {
    const cases: [string, string][] = [
      ['+254712345678', '+254712345678'],
      ['+254112345678', '+254112345678'],
      ['254712345678',  '+254712345678'],
      ['0712345678',    '+254712345678'],
      ['0112345678',    '+254112345678'],
      ['712345678',     '+254712345678'],
      ['112345678',     '+254112345678'],
      ['0712 345 678',  '+254712345678'], // spaces stripped
      ['+254 712 345 678', '+254712345678'],
      ['0712-345-678',  '+254712345678'], // dashes stripped
    ];

    cases.forEach(([input, expected]) => {
      it(`normalizes "${input}" → "${expected}"`, () => {
        expect(normalizeKenyaPhone(input)).toBe(expected);
      });
    });
  });

  describe('invalid numbers — return null', () => {
    const invalid = [
      '+44712345678',    // UK number
      '+1234567890',     // US-ish
      '08123456789',     // Nigerian format
      '123',             // too short
      '070000000',       // only 9 digits (invalid)
      '+2540712345678',  // wrong country prefix structure
      'abcdefghij',      // not numeric
      '',                // empty
      '+254812345678',   // 8xx series (not valid Kenyan mobile)
    ];

    invalid.forEach((input) => {
      it(`rejects "${input}"`, () => {
        expect(normalizeKenyaPhone(input)).toBeNull();
      });
    });
  });

  describe('edge cases', () => {
    it('handles multiple internal spaces', () => {
      expect(normalizeKenyaPhone('07 12 34 56 78')).toBe('+254712345678');
    });

    it('normalizes Safaricom 07xx series', () => {
      expect(normalizeKenyaPhone('0720000000')).toBe('+254720000000');
    });

    it('normalizes Airtel 01xx series', () => {
      expect(normalizeKenyaPhone('0100000000')).toBe('+254100000000');
    });

    it('result always starts with +254 for valid Kenyan numbers', () => {
      const inputs = ['0712345678', '254712345678', '+254712345678', '712345678'];
      inputs.forEach((input) => {
        const result = normalizeKenyaPhone(input);
        expect(result).not.toBeNull();
        expect(result!.startsWith('+254')).toBe(true);
      });
    });
  });
});
