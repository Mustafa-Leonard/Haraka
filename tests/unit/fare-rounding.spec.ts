import { describe, expect, it } from 'vitest';
import {
  minimumWholeKesFare,
  roundFareToWholeKes,
} from '../../backend/src/pricing/fare-rounding';

describe('fare rounding for M-Pesa', () => {
  it('rounds the fare to whole KES using half-up rounding', () => {
    expect(roundFareToWholeKes(10049)).toBe(10000);
    expect(roundFareToWholeKes(10050)).toBe(10100);
    expect(roundFareToWholeKes(10099)).toBe(10100);
  });

  it('rounds the configured minimum up so a quote never undercuts it', () => {
    expect(minimumWholeKesFare(10001)).toBe(10100);
    expect(minimumWholeKesFare(10100)).toBe(10100);
  });

  it('rejects invalid minor-unit values', () => {
    expect(() => roundFareToWholeKes(-1)).toThrow(RangeError);
    expect(() => minimumWholeKesFare(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
