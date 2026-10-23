import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LiveDot } from '../components/ui/LiveDot';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';
import {
  Activity,
  Bike,
  BookOpenCheck,
  LockKeyhole,
  Menu,
  MapPinned,
  Package,
  Scale,
  Tags,
  X,
} from 'lucide-react';
import { ADMIN_WORKSPACE_ACCESS, getStaffHomePath, isStaffPortalRole } from '@haraka/shared-types';

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const staffRole = user?.roles.find((role) => isStaffPortalRole(role));
  const roleLabel: Record<string, string> = {
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER ADMIN',
    DISPATCHER: 'DISPATCH',
    SUPPORT: 'SUPPORT',
    FINANCE: 'FINANCE',
    VERIFICATION_OFFICER: 'VERIFY',
  };
  const workspaceTitle: Record<string, string> = {
    ADMIN: 'Coastal Operations Command Center',
    SUPER_ADMIN: 'Coastal Operations Command Center',
    DISPATCHER: 'Dispatch workspace',
    SUPPORT: 'Support workspace',
    FINANCE: 'Finance workspace',
    VERIFICATION_OFFICER: 'Rider verification workspace',
  };
  const navItems = [
    {
      path: '/admin',
      label: 'Operations Overview',
      icon: Activity,
    },
    {
      path: '/admin/fleet',
      label: 'Live Fleet Map',
      icon: MapPinned,
    },
    {
      path: '/admin/jobs',
      label: 'Deliveries',
      icon: Package,
    },
    {
      path: '/admin/riders',
      label: 'Rider Verification',
      icon: Bike,
    },
    {
      path: '/admin/pricing',
      label: 'Pricing & Zones',
      icon: Tags,
    },
    {
      path: '/admin/ledger',
      label: 'Financial Ledger',
      icon: BookOpenCheck,
    },
    {
      path: '/admin/disputes',
      label: 'Disputes & Exceptions',
      icon: Scale,
    },
    {
      path: '/admin/audit',
      label: 'Security Audit Logs',
      icon: LockKeyhole,
    },
  ];
  const visibleNavItems = navItems.filter((item) =>
    ADMIN_WORKSPACE_ACCESS[item.path]?.some((role) => user?.roles.includes(role)),
  );

  return (
    <div
      className="admin-shell"
      style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Admin Sidebar */}
      <aside
        className={`admin-sidebar${isMenuOpen ? ' is-open' : ''}`}
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
        <div
          className="app-sidebar-brand"
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid #2E3846',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/admin"
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
                color: '#fff',
              }}
            >
              haraka
            </span>
          </Link>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255,106,31,0.2)',
              color: 'var(--color-brand)',
            }}
          >
            {roleLabel[staffRole ?? ''] ?? 'STAFF'}
          </span>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMenuOpen ? 'Close operations navigation' : 'Open operations navigation'}
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
            gap: '4px',
            overflowY: 'auto',
          }}
        >
          {visibleNavItems.map((item) => {
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
                  fontSize: '0.9rem',
                  backgroundColor: active ? 'var(--color-brand)' : 'transparent',
                  color: active ? '#FFFFFF' : '#9AA3AD',
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
            borderTop: '1px solid #2E3846',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(staffRole ?? '') && (
              <LiveDot isLive={true} label="Live Fleet Stream" />
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9AA3AD' }}>
            Logged in:{' '}
            <strong style={{ color: '#fff' }}>{user?.displayName || 'Dispatch Officer'}</strong>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await logout();
              navigate('/admin/login');
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
            {workspaceTitle[staffRole ?? ''] ?? 'Staff workspace'} (Kilifi • Malindi • Mombasa)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              UTC+3 Africa/Nairobi
            </span>
          </div>
        </header>

        <main className="admin-main" style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
