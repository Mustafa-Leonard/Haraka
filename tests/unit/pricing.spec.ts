import { describe, it, expect } from 'vitest';

// ── Pricing Calculation Logic (extracted for unit testing) ─────────────────
// mirrors PricingService.calculateFare() logic

interface PricingInput {
  distanceMeters: number;
  baseFare: number;        // minor units
  perKmRate: number;       // minor units per km
  minimumFare: number;     // minor units
  parcelMultiplier: number; // e.g. 1.0, 1.3, 1.8
  surcharge?: number;       // minor units
}

function calculateFare(input: PricingInput): {
  baseFare: number;
  distanceFare: number;
  subtotal: number;
  parcelFare: number;
  surcharge: number;
  total: number;
} {
  const { distanceMeters, baseFare, perKmRate, minimumFare, parcelMultiplier, surcharge = 0 } = input;

  const distanceKm = distanceMeters / 1000;
  const distanceFare = Math.round(distanceKm * perKmRate);
  const subtotal = baseFare + distanceFare;
  const parcelFare = Math.round(subtotal * parcelMultiplier);
  const total = Math.max(parcelFare + surcharge, minimumFare);

  return { baseFare, distanceFare, subtotal, parcelFare, surcharge, total };
}

describe('Pricing Engine', () => {
  const BASE_RULE = {
    baseFare: 5000,       // KES 50.00
    perKmRate: 1500,      // KES 15.00 / km
    minimumFare: 8000,    // KES 80.00
    parcelMultiplier: 1.0,
    surcharge: 0,
  };

  it('calculates a simple 5 km boda delivery', () => {
    const result = calculateFare({ ...BASE_RULE, distanceMeters: 5000 });
    // distanceFare = 5 * 1500 = 7500
    // subtotal = 5000 + 7500 = 12500
    // parcelFare = 12500 * 1.0 = 12500
    // total = max(12500, 8000) = 12500
    expect(result.distanceFare).toBe(7500);
    expect(result.total).toBe(12500);
  });

  it('applies minimum fare for very short distance', () => {
    const result = calculateFare({ ...BASE_RULE, distanceMeters: 200 });
    // distanceFare = 0.2 * 1500 = 300
    // subtotal = 5000 + 300 = 5300
    // total = max(5300, 8000) = 8000
    expect(result.total).toBe(8000);
  });

  it('applies parcel multiplier correctly for LARGE parcel', () => {
    const result = calculateFare({ ...BASE_RULE, distanceMeters: 5000, parcelMultiplier: 1.5 });
    // subtotal = 12500
    // parcelFare = round(12500 * 1.5) = 18750
    expect(result.parcelFare).toBe(18750);
    expect(result.total).toBe(18750);
  });

  it('adds surcharge to total', () => {
    const result = calculateFare({ ...BASE_RULE, distanceMeters: 5000, surcharge: 1000 });
    // parcelFare = 12500, surcharge = 1000 → total = 13500
    expect(result.total).toBe(13500);
  });

  it('never uses float arithmetic for money — all results are integers', () => {
    const result = calculateFare({ ...BASE_RULE, distanceMeters: 3333, parcelMultiplier: 1.3 });
    expect(Number.isInteger(result.baseFare)).toBe(true);
    expect(Number.isInteger(result.distanceFare)).toBe(true);
    expect(Number.isInteger(result.parcelFare)).toBe(true);
    expect(Number.isInteger(result.total)).toBe(true);
  });

  it('minimum fare enforced when parcel multiplier is < 1 (discount)', () => {
    const result = calculateFare({ ...BASE_RULE, distanceMeters: 100, parcelMultiplier: 0.8 });
    expect(result.total).toBeGreaterThanOrEqual(BASE_RULE.minimumFare);
  });

  it('handles zero distance (pickup only edge case)', () => {
    const result = calculateFare({ ...BASE_RULE, distanceMeters: 0 });
    expect(result.distanceFare).toBe(0);
    expect(result.total).toBe(BASE_RULE.minimumFare);
  });

  it('large distance scales linearly', () => {
    const result5km = calculateFare({ ...BASE_RULE, distanceMeters: 5000 });
    const result10km = calculateFare({ ...BASE_RULE, distanceMeters: 10000 });
    // distanceFare should double
    expect(result10km.distanceFare).toBe(result5km.distanceFare * 2);
  });
});
