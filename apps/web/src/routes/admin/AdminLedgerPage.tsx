import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { apiClient } from '@haraka/api-client';

export const AdminLedgerPage: React.FC = () => {
  const [period, setPeriod] = useState('MTD');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-ledger-summary', period],
    queryFn: () => apiClient.adminGetLedgerSummary(period),
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['admin-ledger-transactions', period],
    queryFn: () => apiClient.adminGetLedgerTransactions(1, 50, period),
  });

  const totalRevenue = (summary?.accounts ?? [])
    .filter((a: any) => a.accountCode.startsWith('4'))
    .reduce((sum: number, a: any) => sum + a.balance, 0);

  const totalPayouts = (summary?.accounts ?? [])
    .filter((a: any) => a.accountCode.startsWith('5'))
    .reduce((sum: number, a: any) => sum + a.balance, 0);

  const platformFee = totalRevenue - totalPayouts;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Double-Entry Ledger
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
            Immutable financial record — every debit has a matching credit. All amounts in KES.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['TODAY', 'WTD', 'MTD', 'YTD'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid',
                borderColor: period === p ? 'var(--color-brand)' : 'var(--color-border)',
                background: period === p ? 'var(--color-brand)' : 'transparent',
                color: period === p ? '#fff' : 'var(--color-text)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard
          label="Gross Revenue"
          value={`KES ${(totalRevenue / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          subValue="All payment inflows"
          icon="💰"
        />
        <StatCard
          label="Rider Payouts"
          value={`KES ${(totalPayouts / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          subValue="Earnings disbursed"
          icon="🛵"
        />
        <StatCard
          label="Platform Net"
          value={`KES ${(platformFee / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          subValue="Revenue minus payouts"
          icon="📈"
        />
      </div>

      {/* Chart of Accounts */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Chart of Accounts</h2>
        {summaryLoading && <p style={{ color: 'var(--color-muted)' }}>Loading accounts…</p>}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                {['Code', 'Account Name', 'Type', 'Balance (KES)'].map((h) => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(summary?.accounts ?? []).map((acc: any, idx: number) => (
                <tr
                  key={acc.accountCode}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-alt)',
                  }}
                >
                  <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {acc.accountCode}
                  </td>
                  <td style={{ padding: '12px 18px', fontWeight: 500 }}>{acc.accountName}</td>
                  <td style={{ padding: '12px 18px', color: 'var(--color-muted)', fontSize: '0.82rem' }}>
                    {acc.accountCode.startsWith('1') ? 'Asset'
                      : acc.accountCode.startsWith('2') ? 'Liability'
                      : acc.accountCode.startsWith('3') ? 'Equity'
                      : acc.accountCode.startsWith('4') ? 'Revenue'
                      : 'Expense'}
                  </td>
                  <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {(acc.balance / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {!summaryLoading && (summary?.accounts ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    No accounts found. Run database seeds to populate chart of accounts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Recent Ledger Transactions */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
          Recent Ledger Transactions
        </h2>
        {txLoading && <p style={{ color: 'var(--color-muted)' }}>Loading transactions…</p>}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                {['Date', 'Description', 'Job Ref', 'Debit', 'Credit', 'Balance Check'].map((h) => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(transactions?.data ?? []).map((tx: any, idx: number) => (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-alt)',
                  }}
                >
                  <td style={{ padding: '10px 16px', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                    {new Date(tx.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '10px 16px' }}>{tx.description}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {tx.jobRef ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', textAlign: 'right' }}>
                    {tx.totalDebit > 0 ? (tx.totalDebit / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', textAlign: 'right' }}>
                    {tx.totalCredit > 0 ? (tx.totalCredit / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: tx.isBalanced ? 'rgba(255,106,31,0.1)' : 'rgba(239,68,68,0.1)',
                        color: tx.isBalanced ? 'var(--color-brand)' : 'var(--color-danger)',
                      }}
                    >
                      {tx.isBalanced ? 'BALANCED' : '⚠ UNBALANCED'}
                    </span>
                  </td>
                </tr>
              ))}
              {!txLoading && (transactions?.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    No transactions for selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
};
