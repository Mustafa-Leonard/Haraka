import { describe, expect, it } from 'vitest';
import { calculateRiderShareAmount } from '../../backend/src/ledger/rider-share';
import { buildFareSplitEntries } from '../../backend/src/ledger/fare-entries';

describe('calculateRiderShareAmount', () => {
  it('calculates share from the locked fare using half-up minor-unit rounding', () => {
    expect(calculateRiderShareAmount(10001, 5000)).toBe(5001);
  });

  describe('buildFareSplitEntries', () => {
    it('posts COD receipts to cash-in-transit and splits the locked fare', () => {
      const entries = buildFareSplitEntries(12500, 7500, 'CASH_IN_TRANSIT_RIDER', 'RIDER:user-id');

      expect(entries).toEqual([
        expect.objectContaining({
          debitAccountCode: 'CASH_IN_TRANSIT_RIDER',
          creditAccountCode: 'PLATFORM_REVENUE',
          amount: 5000,
        }),
        expect.objectContaining({
          debitAccountCode: 'CASH_IN_TRANSIT_RIDER',
          creditAccountCode: 'RIDER:user-id',
          amount: 7500,
        }),
      ]);
      expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(12500);
    });

    it('posts M-Pesa receipts to clearing and supports zero or full rider shares', () => {
      expect(buildFareSplitEntries(10000, 0, 'MPESA_CLEARING', 'RIDER_PAYABLE')).toEqual([
        expect.objectContaining({ creditAccountCode: 'PLATFORM_REVENUE', amount: 10000 }),
      ]);
      expect(buildFareSplitEntries(10000, 10000, 'MPESA_CLEARING', 'RIDER_PAYABLE')).toEqual([
        expect.objectContaining({ creditAccountCode: 'RIDER_PAYABLE', amount: 10000 }),
      ]);
    });

    it('rejects invalid fare splits', () => {
      expect(() => buildFareSplitEntries(10000, 10001, 'MPESA_CLEARING', 'RIDER_PAYABLE')).toThrow(
        RangeError,
      );
    });
  });

  it('supports zero and full fare shares', () => {
    expect(calculateRiderShareAmount(12500, 0)).toBe(0);
    expect(calculateRiderShareAmount(12500, 10000)).toBe(12500);
  });

  it('rejects out-of-range or unsafe values', () => {
    expect(() => calculateRiderShareAmount(-1, 5000)).toThrow(RangeError);
    expect(() => calculateRiderShareAmount(Number.MAX_SAFE_INTEGER + 1, 5000)).toThrow(RangeError);
    expect(() => calculateRiderShareAmount(100, 10001)).toThrow(RangeError);
    expect(() => calculateRiderShareAmount(100, 12.5)).toThrow(RangeError);
  });
});
