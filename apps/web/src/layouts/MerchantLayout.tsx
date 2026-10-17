import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LiveDot } from '../components/ui/LiveDot';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';

export const MerchantLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/merchant', label: 'Dashboard', icon: '📊' },
    { path: '/merchant/new-delivery', label: 'New Delivery', icon: '📦' },
    { path: '/merchant/jobs', label: 'Deliveries', icon: '🚚' },
    { path: '/merchant/addresses', label: 'Saved Addresses', icon: '📍' },
    { path: '/merchant/payments', label: 'Payments', icon: '💳' },
    { path: '/merchant/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--color-sidebar-bg)',
          borderRight: '1px solid var(--color-sidebar-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/merchant" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              H
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-ink)' }}>
              haraka
            </span>
          </Link>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: '#EEF4FF', color: 'var(--color-merchant)' }}>
            MERCHANT
          </span>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                  fontSize: '0.95rem',
                  backgroundColor: active ? 'var(--color-sidebar-item-active)' : 'transparent',
                  color: active ? 'var(--color-sidebar-item-active-text)' : 'var(--color-ink)',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <LiveDot isLive={true} label="Real-time" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', truncate: 'ellipsis' }}>
            👤 {user?.displayName || user?.phone || 'Merchant'}
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

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            Merchant Delivery Hub
          </div>
          <Button size="sm" onClick={() => navigate('/merchant/new-delivery')}>
            + Book Delivery
          </Button>
        </header>

        <main style={{ flex: 1, padding: '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
