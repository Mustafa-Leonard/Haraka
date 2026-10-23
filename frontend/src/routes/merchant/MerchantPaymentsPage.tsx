import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';
import { CreditCard } from 'lucide-react';

export const MerchantPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.getMerchantPayments(1, 20);
        setPayments(res.data || []);
      } catch {
        setPayments([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Payment &amp; Transaction Receipts
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          Historical record of M-Pesa STK captures, refunds, and Cash on Delivery settlements.
        </p>
      </div>

      <Card style={{ padding: '24px' }}>
        {isLoading ? (
          <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '20px' }}>Loading payment receipts…</p>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)' }}>
            <CreditCard size={36} aria-hidden="true" style={{ marginBottom: 8, color: 'var(--color-brand)' }} />
            <p style={{ fontWeight: 600 }}>No payment transactions recorded yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Payment receipts will appear here once you book deliveries.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>TRANSACTION REF</th>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>METHOD</th>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '12px 10px', fontWeight: 600 }}>DATE</th>
                <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 10px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {p.providerRef || p.id.slice(0, 8)}
                  </td>
                  <td style={{ padding: '14px 10px' }}>{p.method?.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '14px 10px' }}>
                    <StatusPill status={p.status} />
                  </td>
                  <td style={{ padding: '14px 10px', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                    {new Date(p.createdAt).toLocaleDateString('en-KE')}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-brand)' }}>
                    KES {(p.amount / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
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
