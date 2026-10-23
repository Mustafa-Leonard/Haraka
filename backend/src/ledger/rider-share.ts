export function calculateRiderShareAmount(fareMinorUnits: number, shareBps: number): number {
  if (!Number.isSafeInteger(fareMinorUnits) || fareMinorUnits < 0) {
    throw new RangeError('Fare must be a non-negative safe integer in minor units.');
  }
  if (!Number.isInteger(shareBps) || shareBps < 0 || shareBps > 10_000) {
    throw new RangeError('Rider share must be an integer between 0 and 10000 basis points.');
  }
  const amount = (BigInt(fareMinorUnits) * BigInt(shareBps) + 5_000n) / 10_000n;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Calculated rider share exceeds the safe integer limit.');
  }
  return Number(amount);
}
