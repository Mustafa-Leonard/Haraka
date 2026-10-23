import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LiveDot } from '../components/ui/LiveDot';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';
import { apiClient } from '@haraka/api-client';
import { Bike, CircleDollarSign, Menu, PackageOpen, Settings, UserRound, X } from 'lucide-react';

export const RiderLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const {
    data: riderProfile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['rider-profile'],
    queryFn: () => apiClient.getRiderProfile(),
  });
  const canGoOnline =
    riderProfile?.verificationStatus === 'APPROVED' && Boolean(riderProfile.primaryVehicle);
  const verificationNotice =
    riderProfile?.verificationStatus === 'PENDING' ||
    riderProfile?.verificationStatus === 'UNDER_REVIEW'
      ? 'Your rider profile is awaiting approval. Availability will unlock after verification.'
      : riderProfile?.verificationStatus === 'REJECTED'
        ? 'Your rider application was not approved. Contact operations for next steps.'
        : riderProfile?.verificationStatus === 'SUSPENDED'
          ? 'Your rider account is suspended. Contact operations for assistance.'
          : null;

  useEffect(() => {
    if (riderProfile) setIsOnline(riderProfile.onlineStatus !== 'OFFLINE');
  }, [riderProfile]);

  const navItems = [
    { path: '/rider/offers', label: 'Delivery Offers', icon: PackageOpen },
    { path: '/rider/active', label: 'Active Delivery', icon: Bike },
    { path: '/rider/earnings', label: 'Earnings & Payouts', icon: CircleDollarSign },
    { path: '/rider/settings', label: 'Account & Verification', icon: Settings },
  ];

  const handleToggleOnline = async () => {
    setIsToggling(true);
    setAvailabilityError(null);
    try {
      const res = await apiClient.setRiderAvailability(!isOnline);
      setIsOnline(res.online);
      queryClient.setQueryData(['rider-profile'], (profile: typeof riderProfile) =>
        profile ? { ...profile, onlineStatus: res.online ? 'ONLINE' : 'OFFLINE' } : profile,
      );
    } catch (error) {
      setAvailabilityError(
        error instanceof Error ? error.message : 'Unable to update availability.',
      );
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      className="rider-shell"
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <aside
        className={`rider-sidebar${isMenuOpen ? ' is-open' : ''}`}
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
        <div className="app-sidebar-brand" style={brandStyle}>
          <Link to="/rider/offers" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={brandMarkStyle}>H</span>
            <span style={brandNameStyle}>haraka</span>
          </Link>
          <span style={roleBadgeStyle}>RIDER</span>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMenuOpen ? 'Close rider navigation' : 'Open rider navigation'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <nav className="app-sidebar-nav" aria-label="Rider pages" style={navStyle}>
          {navItems.map((item) => {
            const active =
              location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
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

        <div className="app-sidebar-footer" style={footerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <LiveDot isLive={isOnline} label={isOnline ? 'Online' : 'Offline'} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            <UserRound size={16} aria-hidden="true" /> {user?.displayName || 'Rider'}
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

      <div
        className="rider-workspace"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <header
          className="rider-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'var(--color-card)',
            borderBottom: '1px solid var(--color-border)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            className="rider-brand"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span style={{ fontWeight: 700 }}>Rider workspace</span>
            <LiveDot isLive={isOnline} label={isOnline ? 'Online' : 'Offline'} />
          </div>
          <div
            className="rider-header-controls"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Button
              size="sm"
              variant={isOnline ? 'primary' : 'secondary'}
              onClick={handleToggleOnline}
              isLoading={isToggling}
              disabled={isLoading || isError || isToggling || (!isOnline && !canGoOnline)}
              style={{ fontSize: '0.8rem', minHeight: '36px' }}
            >
              {isOnline ? '● Online' : '○ Offline'}
            </Button>
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </header>

        {availabilityError && (
          <p role="alert" style={{ margin: 0, padding: '8px 24px', color: 'var(--color-error)' }}>
            {availabilityError}
          </p>
        )}
        {verificationNotice && (
          <p role="status" style={noticeStyle}>
            {verificationNotice}
          </p>
        )}
        {isError && (
          <p role="alert" style={noticeStyle}>
            Rider profile could not be loaded. Refresh the page or try again later.
          </p>
        )}

        <main className="rider-main" style={{ flex: 1, padding: '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const brandStyle: React.CSSProperties = {
  padding: '24px 20px',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};
const brandMarkStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  backgroundColor: 'var(--color-brand)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
};
const brandNameStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '1.2rem',
  color: 'var(--color-ink)',
};
const roleBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '6px',
  backgroundColor: '#FFF0E8',
  color: 'var(--color-brand)',
};
const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '20px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};
const footerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderTop: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};
const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: '8px 24px',
  color: 'var(--color-muted)',
  backgroundColor: 'var(--color-card)',
};
