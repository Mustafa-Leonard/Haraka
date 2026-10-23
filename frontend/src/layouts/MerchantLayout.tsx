import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LiveDot } from '../components/ui/LiveDot';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';
import {
  CreditCard,
  LayoutDashboard,
  Menu,
  MapPin,
  PackagePlus,
  Settings,
  Truck,
  UserRound,
  X,
} from 'lucide-react';

export const MerchantLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/merchant/new-delivery', label: 'New Delivery', icon: PackagePlus },
    { path: '/merchant/jobs', label: 'Deliveries', icon: Truck },
    { path: '/merchant/addresses', label: 'Saved Addresses', icon: MapPin },
    { path: '/merchant/payments', label: 'Payments', icon: CreditCard },
    { path: '/merchant/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div
      className="merchant-shell"
      style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Sidebar */}
      <aside
        className={`merchant-sidebar${isMenuOpen ? ' is-open' : ''}`}
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
        <div
          className="app-sidebar-brand"
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/merchant"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
              }}
            >
              H
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.2rem',
                color: 'var(--color-ink)',
              }}
            >
              haraka
            </span>
          </Link>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: '#EEF4FF',
              color: 'var(--color-merchant)',
            }}
          >
            MERCHANT
          </span>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMenuOpen ? 'Close merchant navigation' : 'Open merchant navigation'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <nav
          className="app-sidebar-nav"
          style={{
            flex: 1,
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {navItems.map((item) => {
            const active =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                onClick={() => setIsMenuOpen(false)}
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
                <item.icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className="app-sidebar-footer"
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <LiveDot isLive={true} label="Real-time" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-muted)',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <UserRound size={16} aria-hidden="true" />{' '}
            {user?.displayName || user?.phone || 'Merchant'}
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

        <main className="merchant-main" style={{ flex: 1, padding: '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
