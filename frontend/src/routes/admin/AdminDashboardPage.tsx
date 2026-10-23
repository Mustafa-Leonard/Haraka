import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { apiClient } from '@haraka/api-client';
import { Activity, Bike, BookOpenCheck, MapPinned, TrendingUp, Users } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => apiClient.adminGetDashboard(),
  });

  const { data: ledgerSummary } = useQuery({
    queryKey: ['admin-ledger-mtd'],
    queryFn: () => apiClient.adminGetLedgerSummary('MTD'),
  });

  const totalRevenue = (ledgerSummary?.accounts ?? [])
    .filter((a: any) => a.accountCode.startsWith('4'))
    .reduce((sum: number, a: any) => sum + a.balance, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Operations Command Center
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
            Live delivery and fleet telemetry across Kilifi, Malindi, and Mombasa zones.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={() => navigate('/admin/fleet')}>
            <MapPinned size={16} aria-hidden="true" /> Live Fleet Map
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/ledger')}>
            <BookOpenCheck size={16} aria-hidden="true" /> Double-Entry Ledger
          </Button>
        </div>
      </div>

      {isLoading && (
        <p style={{ color: 'var(--color-muted)' }}>Loading live database metrics…</p>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)' }}>
          Could not connect to backend operations API. Please check server status.
        </p>
      )}

      {/* KPI Cards — Purely database-derived */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <StatCard
          label="Active Deliveries"
          value={stats?.activeJobs ?? 0}
          subValue="In matching or in transit"
          icon={<Activity size={22} aria-hidden="true" />}
        />
        <StatCard
          label="Online Verified Riders"
          value={stats?.activeRiders ?? 0}
          subValue="Available for matching"
          icon={<Bike size={22} aria-hidden="true" />}
        />
        <StatCard
          label="Platform Revenue (MTD)"
          value={`KES ${(totalRevenue / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          subValue="Double-entry verified in DB"
          icon={<TrendingUp size={22} aria-hidden="true" />}
        />
        <StatCard
          label="Total Registered Users"
          value={stats?.totalUsers ?? 0}
          subValue="Merchants, riders, and staff"
          icon={<Users size={22} aria-hidden="true" />}
        />
      </div>

      {/* Operations Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Dispatch Queue</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '18px' }}>
            Inspect all active orders, re-assign stalled jobs, and manage exceptions.
          </p>
          <Button size="sm" onClick={() => navigate('/admin/jobs')}>
            Manage Deliveries
          </Button>
        </Card>

        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Rider Approvals</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '18px' }}>
            Review pending onboarding applications, driving licenses, and vehicle plates.
          </p>
          <Button size="sm" onClick={() => navigate('/admin/riders')}>
            Review Pending Riders
          </Button>
        </Card>

        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Financial Audit & Ledger</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '18px' }}>
            Audit double-entry transactions, M-Pesa settlements, and rider payables.
          </p>
          <Button size="sm" onClick={() => navigate('/admin/ledger')}>
            View Ledger Accounts
          </Button>
        </Card>
      </div>
    </div>
  );
};
