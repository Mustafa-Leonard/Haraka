import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { apiClient } from '@haraka/api-client';
import type { RiderEarningsDto } from '@haraka/shared-types';
import { CircleAlert, CircleDollarSign, PackageCheck } from 'lucide-react';

export const RiderEarningsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<RiderEarningsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEarnings = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getRiderEarnings();
      setEarnings(res);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load earnings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const availableBalanceKes = (earnings?.availableBalance ?? 0) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Rider Wallet & Earnings
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          Available balance is calculated from posted KES ledger entries, less pending payout
          requests.
        </p>
      </div>
      {loadError && (
        <p role="alert" style={{ color: '#D64545' }}>
          {loadError}
        </p>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <StatCard
          label="Available Balance"
          value={`KES ${availableBalanceKes.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          subValue="After pending payout requests"
          icon={<CircleDollarSign size={22} aria-hidden="true" />}
        />
        <StatCard
          label="Completed Deliveries This Week"
          value={earnings?.completedJobsThisWeek ?? 0}
          subValue="Verified delivery completions"
          icon={<PackageCheck size={22} aria-hidden="true" />}
        />
      </div>

      {/* Payout Availability */}
      <Card style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <CircleAlert size={20} aria-hidden="true" style={{ color: '#B45309', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Payouts are not available yet</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            M-Pesa disbursement and operations review have not been implemented. No payout request
            can be submitted from this page.
          </div>
        </div>
      </Card>

      {/* Breakdown Table */}
      <Card style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
          Weekly Ledger Activity
        </h2>

        {isLoading ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
            Loading ledger balance…
          </p>
        ) : !earnings || earnings.ledgerActivity.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px',
              color: 'var(--color-muted)',
              fontSize: '0.9rem',
            }}
          >
            No posted rider ledger activity is available yet.
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-muted)',
                }}
              >
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>DATE</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>DELIVERIES</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>
                  NET LEDGER CHANGE
                </th>
              </tr>
            </thead>
            <tbody>
              {earnings.ledgerActivity.map((row) => (
                <tr key={row.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{row.date}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--color-muted)' }}>
                    {row.completedJobs} trip(s)
                  </td>
                  <td
                    style={{
                      padding: '12px 8px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--color-brand)',
                    }}
                  >
                    KES{' '}
                    {(row.netChange / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
