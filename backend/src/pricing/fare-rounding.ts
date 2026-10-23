export function roundFareToWholeKes(amountMinorUnits: number): number {
  if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits < 0) {
    throw new RangeError('Fare must be a non-negative safe integer in minor units.');
  }
  const amount = ((BigInt(amountMinorUnits) + 50n) / 100n) * 100n;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Rounded fare exceeds the safe integer limit.');
  }
  return Number(amount);
}

export function minimumWholeKesFare(amountMinorUnits: number): number {
  if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits < 0) {
    throw new RangeError('Minimum fare must be a non-negative safe integer in minor units.');
  }
  const amount = ((BigInt(amountMinorUnits) + 99n) / 100n) * 100n;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Minimum fare exceeds the safe integer limit.');
  }
  return Number(amount);
}
