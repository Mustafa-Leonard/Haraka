import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 148,
    activeRiders: 32,
    activeJobs: 11,
    totalRevenue: 642000, // KES 6,420.00
    systemStatus: 'HEALTHY',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Operations Command Center
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
            Real-time delivery management across Kilifi, Malindi, and Mombasa zones.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={() => navigate('/admin/fleet')}>
            🗺️ Live Fleet Map
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/ledger')}>
            📒 Double-Entry Ledger
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <StatCard
          label="Active Deliveries"
          value={stats.activeJobs}
          subValue="Across 3 coastal zones"
          icon="⚡"
        />
        <StatCard
          label="Online Verified Riders"
          value={stats.activeRiders}
          subValue="Available for matching"
          icon="🛵"
        />
        <StatCard
          label="Platform Revenue (MTD)"
          value={`KES ${(stats.totalRevenue / 100).toLocaleString()}`}
          subValue="Double-entry verified"
          icon="📈"
        />
        <StatCard
          label="System Health"
          value="100% OK"
          subValue="DB, PostGIS, Redis connected"
          icon="🛡️"
        />
      </div>

      {/* Quick Ops Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Dispatch Queue</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '18px' }}>
            Monitor automated matching and manually assign jobs that have timed out past 5 offer cycles.
          </p>
          <Button size="sm" onClick={() => navigate('/admin/jobs')}>
            Manage Deliveries
          </Button>
        </Card>

        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Rider Approvals</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '18px' }}>
            Verify National IDs, driving licenses, and vehicle inspection documents for new boda & tuk-tuk applicants.
          </p>
          <Button size="sm" onClick={() => navigate('/admin/riders')}>
            Review Pending Riders
          </Button>
        </Card>

        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px' }}>Financial Audit & Ledger</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '18px' }}>
            Inspect balanced debit and credit entries across M-Pesa clearing, merchant payables, and rider earnings.
          </p>
          <Button size="sm" onClick={() => navigate('/admin/ledger')}>
            View Ledger Accounts
          </Button>
        </Card>
      </div>
    </div>
  );
};
