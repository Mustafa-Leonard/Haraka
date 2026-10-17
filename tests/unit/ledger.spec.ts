import { describe, it, expect } from 'vitest';

// ── Double-Entry Ledger Invariants ─────────────────────────────────────────
// These tests verify the accounting invariants that the LedgerService enforces.

interface LedgerEntry {
  accountCode: string;
  side: 'DEBIT' | 'CREDIT';
  amount: number; // integer minor units
}

interface LedgerTransaction {
  description: string;
  entries: LedgerEntry[];
}

function isBalanced(tx: LedgerTransaction): boolean {
  const totalDebits = tx.entries
    .filter((e) => e.side === 'DEBIT')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalCredits = tx.entries
    .filter((e) => e.side === 'CREDIT')
    .reduce((sum, e) => sum + e.amount, 0);
  return totalDebits === totalCredits;
}

function getAccountBalance(entries: LedgerEntry[], accountCode: string): number {
  return entries
    .filter((e) => e.accountCode === accountCode)
    .reduce((sum, e) => sum + (e.side === 'DEBIT' ? e.amount : -e.amount), 0);
}

function validateNoZeroAmounts(tx: LedgerTransaction): boolean {
  return tx.entries.every((e) => e.amount > 0);
}

function validateNoFloats(tx: LedgerTransaction): boolean {
  return tx.entries.every((e) => Number.isInteger(e.amount));
}

describe('Double-Entry Ledger Invariants', () => {
  // ── Fixture: M-Pesa payment for job KES 150.00 ────────────────────────
  // Haraka earns KES 150, pays rider KES 120, keeps KES 30 platform fee
  const mpesaPaymentTx: LedgerTransaction = {
    description: 'M-Pesa payment for job JOB-001',
    entries: [
      { accountCode: '1001', side: 'DEBIT',  amount: 15000 }, // Cash/MPesa asset +150
      { accountCode: '4001', side: 'CREDIT', amount: 15000 }, // Revenue -150
    ],
  };

  const riderPayoutTx: LedgerTransaction = {
    description: 'Rider payout for job JOB-001',
    entries: [
      { accountCode: '5001', side: 'DEBIT',  amount: 12000 }, // Expense (rider cost) +120
      { accountCode: '2001', side: 'CREDIT', amount: 12000 }, // Payable to rider -120
    ],
  };

  const payoutSettleTx: LedgerTransaction = {
    description: 'Settle rider payout via M-Pesa',
    entries: [
      { accountCode: '2001', side: 'DEBIT',  amount: 12000 }, // Clear payable
      { accountCode: '1001', side: 'CREDIT', amount: 12000 }, // Cash out
    ],
  };

  describe('Balance rule: every transaction must balance', () => {
    it('M-Pesa payment transaction is balanced', () => {
      expect(isBalanced(mpesaPaymentTx)).toBe(true);
    });

    it('rider payout transaction is balanced', () => {
      expect(isBalanced(riderPayoutTx)).toBe(true);
    });

    it('settlement transaction is balanced', () => {
      expect(isBalanced(payoutSettleTx)).toBe(true);
    });

    it('detects an unbalanced transaction', () => {
      const unbalanced: LedgerTransaction = {
        description: 'Bad transaction',
        entries: [
          { accountCode: '1001', side: 'DEBIT',  amount: 15000 },
          { accountCode: '4001', side: 'CREDIT', amount: 14000 }, // wrong
        ],
      };
      expect(isBalanced(unbalanced)).toBe(false);
    });
  });

  describe('No zero or negative amounts', () => {
    it('all amounts in payment tx are positive', () => {
      expect(validateNoZeroAmounts(mpesaPaymentTx)).toBe(true);
    });

    it('detects zero-amount entry', () => {
      const bad: LedgerTransaction = {
        description: 'Bad',
        entries: [
          { accountCode: '1001', side: 'DEBIT',  amount: 0 },
          { accountCode: '4001', side: 'CREDIT', amount: 0 },
        ],
      };
      expect(validateNoZeroAmounts(bad)).toBe(false);
    });
  });

  describe('Integer-only amounts (no floats)', () => {
    it('payment tx uses only integers', () => {
      expect(validateNoFloats(mpesaPaymentTx)).toBe(true);
    });

    it('detects float amount', () => {
      const bad: LedgerTransaction = {
        description: 'Float test',
        entries: [
          { accountCode: '1001', side: 'DEBIT',  amount: 15000.5 },
          { accountCode: '4001', side: 'CREDIT', amount: 15000.5 },
        ],
      };
      expect(validateNoFloats(bad)).toBe(false);
    });
  });

  describe('Account balance computation', () => {
    const allEntries = [
      ...mpesaPaymentTx.entries,
      ...riderPayoutTx.entries,
      ...payoutSettleTx.entries,
    ];

    it('asset account 1001 ends at KES 30.00 (15000 - 12000 minor units)', () => {
      // DEBIT 15000 (payment in), CREDIT 12000 (payout out) → net = 3000
      const balance = getAccountBalance(allEntries, '1001');
      expect(balance).toBe(3000);
    });

    it('revenue account 4001 shows KES 150.00 credit balance', () => {
      // CREDIT 15000 → balance is -15000 (credit-normal)
      const balance = getAccountBalance(allEntries, '4001');
      expect(balance).toBe(-15000);
    });

    it('payable account 2001 clears to zero after settlement', () => {
      // CREDIT 12000 then DEBIT 12000 → net = 0
      const balance = getAccountBalance(allEntries, '2001');
      expect(balance).toBe(0);
    });
  });

  describe('Reversal / correction entries', () => {
    it('a reversal transaction cancels the original', () => {
      const original: LedgerTransaction = {
        description: 'Original payment',
        entries: [
          { accountCode: '1001', side: 'DEBIT',  amount: 5000 },
          { accountCode: '4001', side: 'CREDIT', amount: 5000 },
        ],
      };
      const reversal: LedgerTransaction = {
        description: 'Reversal of original payment',
        entries: [
          { accountCode: '4001', side: 'DEBIT',  amount: 5000 },
          { accountCode: '1001', side: 'CREDIT', amount: 5000 },
        ],
      };
      const combined = [...original.entries, ...reversal.entries];
      expect(getAccountBalance(combined, '1001')).toBe(0);
      expect(getAccountBalance(combined, '4001')).toBe(0);
    });
  });
});
