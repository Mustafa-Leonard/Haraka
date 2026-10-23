import type { PostTransactionParams } from './ledger.service';

export function buildFareSplitEntries(
  fareAmount: number,
  riderShareAmount: number,
  sourceAccountCode: string,
  riderCreditAccountCode: string,
): PostTransactionParams['entries'] {
  if (
    !Number.isSafeInteger(fareAmount) ||
    fareAmount <= 0 ||
    !Number.isSafeInteger(riderShareAmount) ||
    riderShareAmount < 0 ||
    riderShareAmount > fareAmount
  ) {
    throw new RangeError('Fare split must contain valid positive minor-unit amounts.');
  }

  const platformShare = fareAmount - riderShareAmount;
  const entries: PostTransactionParams['entries'] = [];
  if (platformShare > 0) {
    entries.push({
      debitAccountCode: sourceAccountCode,
      creditAccountCode: 'PLATFORM_REVENUE',
      amount: platformShare,
      description: 'Platform share of locked delivery fare',
    });
  }
  if (riderShareAmount > 0) {
    entries.push({
      debitAccountCode: sourceAccountCode,
      creditAccountCode: riderCreditAccountCode,
      amount: riderShareAmount,
      description: 'Rider share of locked delivery fare',
    });
  }
  return entries;
}
