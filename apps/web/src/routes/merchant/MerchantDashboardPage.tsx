import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';
import type { MerchantDashboardDto, JobSummaryDto } from '@haraka/shared-types';

export const MerchantDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MerchantDashboardDto | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashRes, jobsRes] = await Promise.all([
          apiClient.getMerchantDashboard(),
          apiClient.getMerchantJobs(1, 5),
        ]);
        setStats(dashRes);
        setRecentJobs(jobsRes.data);
      } catch (err) {
        console.error('Failed to load merchant dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Merchant Delivery Hub
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Overview of your active deliveries and logistics revenue in coastal Kenya.
          </p>
        </div>
        <Button onClick={() => navigate('/merchant/new-delivery')}>
          + Send New Parcel
        </Button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <StatCard
          label="Active Deliveries"
          value={stats?.activeJobs ?? 0}
          subValue="In matching or in transit"
          icon="🛵"
        />
        <StatCard
          label="Today's Deliveries"
          value={stats?.todayJobs ?? 0}
          subValue="Total booked today"
          icon="📦"
        />
        <StatCard
          label="Today's Spend"
          value={`KES ${((stats?.todayRevenue ?? 0) / 100).toLocaleString()}`}
          subValue="Captured via M-Pesa & COD"
          icon="💳"
        />
        <StatCard
          label="Average Rider ETA"
          value="12 mins"
          subValue="Kilifi town average"
          icon="⏱️"
        />
      </div>

      {/* Recent Deliveries Table */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Recent Deliveries
          </h2>
          <Button size="sm" variant="secondary" onClick={() => navigate('/merchant/jobs')}>
            View All ({stats?.todayJobs ?? 0})
          </Button>
        </div>

        {recentJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📦</div>
            <div style={{ fontWeight: 600 }}>No active deliveries booked yet.</div>
            <p style={{ fontSize: '0.9rem', margin: '8px 0 16px' }}>Request a live quote to send your first parcel.</p>
            <Button onClick={() => navigate('/merchant/new-delivery')}>Book a Delivery</Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>REFERENCE</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>RECIPIENT</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>ROUTE</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>AMOUNT</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px 10px', fontWeight: 700, color: 'var(--color-brand)' }}>
                      {job.referenceCode}
                    </td>
                    <td style={{ padding: '14px 10px' }}>{job.recipientName}</td>
                    <td style={{ padding: '14px 10px' }}>
                      {job.pickupTown} → {job.dropoffTown}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      <StatusPill status={job.status} />
                    </td>
                    <td style={{ padding: '14px 10px', fontWeight: 600 }}>
                      KES {(job.quotedAmount / 100).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/merchant/jobs/${job.id}`)}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
