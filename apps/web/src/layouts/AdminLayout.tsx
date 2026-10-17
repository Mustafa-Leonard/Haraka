import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LiveDot } from '../components/ui/LiveDot';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/admin', label: 'Operations Overview', icon: '⚡' },
    { path: '/admin/fleet', label: 'Live Fleet Map', icon: '🗺️' },
    { path: '/admin/jobs', label: 'All Deliveries', icon: '📦' },
    { path: '/admin/riders', label: 'Rider Verification', icon: '🛵' },
    { path: '/admin/pricing', label: 'Pricing & Zones', icon: '🏷️' },
    { path: '/admin/ledger', label: 'Double-Entry Ledger', icon: '📒' },
    { path: '/admin/disputes', label: 'Disputes & Exceptions', icon: '⚖️' },
    { path: '/admin/audit', label: 'Security Audit Logs', icon: '🔒' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Admin Sidebar */}
      <aside
        style={{
          width: '270px',
          backgroundColor: '#1E2530', // Admin slate styling
          color: '#F1EFEC',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #2E3846', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              H
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>
              haraka
            </span>
          </Link>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,106,31,0.2)', color: 'var(--color-brand)' }}>
            DISPATCH OPS
          </span>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  backgroundColor: active ? 'var(--color-brand)' : 'transparent',
                  color: active ? '#FFFFFF' : '#9AA3AD',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #2E3846', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <LiveDot isLive={true} label="Live Fleet Stream" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9AA3AD' }}>
            Logged in: <strong style={{ color: '#fff' }}>{user?.displayName || 'Dispatch Officer'}</strong>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            {t('nav.logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: '64px',
            backgroundColor: 'var(--color-card)',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-ink)' }}>
            Coastal Operations Command Center (Kilifi • Malindi • Mombasa)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              UTC+3 Africa/Nairobi
            </span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
