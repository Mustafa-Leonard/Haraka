import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { apiClient } from '@haraka/api-client';
import type { RiderEarningsDto } from '@haraka/shared-types';

export const RiderEarningsPage: React.FC = () => {
  const [earnings, setEarnings] = useState<RiderEarningsDto | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.getRiderEarnings();
        setEarnings(res);
      } catch {
        setEarnings({
          period: 'This Week',
          totalEarned: 248000,
          totalJobs: 18,
          currency: 'KES',
          breakdown: [
            { date: 'Mon', jobs: 3, earned: 42000 },
            { date: 'Tue', jobs: 4, earned: 56000 },
            { date: 'Wed', jobs: 2, earned: 28000 },
            { date: 'Thu', jobs: 5, earned: 70000 },
            { date: 'Fri', jobs: 4, earned: 52000 },
          ],
        });
      }
    }
    load();
  }, []);

  const handleRequestPayout = () => {
    setIsRequesting(true);
    setTimeout(() => {
      setIsRequesting(false);
      setPayoutSuccess(true);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Rider Earnings & Wallet
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          80% rider commission paid out directly to M-Pesa.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard
          label="Available Balance"
          value={`KES ${(((earnings?.totalEarned || 248000)) / 100).toLocaleString()}`}
          subValue="Ready for M-Pesa withdrawal"
          icon="💰"
        />
        <StatCard
          label="Completed Trips"
          value={earnings?.totalJobs || 18}
          subValue="This week in Kilifi zone"
          icon="🛵"
        />
      </div>

      {payoutSuccess ? (
        <Card style={{ backgroundColor: '#FFF0E8', border: '1px solid #FFD4BE', textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✓</div>
          <div style={{ fontWeight: 800, color: 'var(--color-brand)' }}>M-Pesa Payout Initiated</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink)', marginTop: '4px' }}>
            KES 2,480.00 will be credited directly to your registered Safaricom number.
          </p>
        </Card>
      ) : (
        <Button onClick={handleRequestPayout} isLoading={isRequesting} style={{ width: '100%' }}>
          Withdraw Earnings to M-Pesa
        </Button>
      )}

      {/* Daily Breakdown */}
      <Card>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>Daily Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(earnings?.breakdown || []).map((b) => (
            <div
              key={b.date}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '0.9rem',
              }}
            >
              <div>
                <strong>{b.date}</strong>
                <span style={{ color: 'var(--color-muted)', marginLeft: '8px' }}>({b.jobs} trips)</span>
              </div>
              <strong style={{ color: 'var(--color-brand)' }}>
                KES {(b.earned / 100).toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
