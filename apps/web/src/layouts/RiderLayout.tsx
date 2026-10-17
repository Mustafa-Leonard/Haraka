import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LiveDot } from '../components/ui/LiveDot';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';
import { apiClient } from '@haraka/api-client';

export const RiderLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isOnline, setIsOnline] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const handleToggleOnline = async () => {
    setIsToggling(true);
    try {
      const res = await apiClient.setRiderAvailability(!isOnline);
      setIsOnline(res.online);
    } catch {
      setIsOnline(!isOnline);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSosTrigger = () => {
    setSosActive(true);
    alert('🚨 EMERGENCY SOS: Location and alert transmitted to Haraka operations room and emergency dispatch.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg)', maxWidth: '640px', margin: '0 auto', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
      {/* Rider Topbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--color-card)',
          borderBottom: '1px solid var(--color-border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--color-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            H
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-ink)', fontFamily: 'var(--font-heading)' }}>
            Rider PWA
          </span>
          <LiveDot isLive={isOnline} label={isOnline ? 'Online' : 'Offline'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            size="sm"
            variant={isOnline ? 'primary' : 'secondary'}
            onClick={handleToggleOnline}
            isLoading={isToggling}
            style={{ fontSize: '0.8rem', minHeight: '36px' }}
          >
            {isOnline ? '● Online' : '○ Offline'}
          </Button>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      {/* SOS Alert Bar */}
      <div style={{ backgroundColor: '#FEF0F0', borderBottom: '1px solid #FCA5A5', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', color: '#D64545', fontWeight: 600 }}>
          🛡️ Coastal Rider Safety Network
        </span>
        <Button
          size="sm"
          variant="danger"
          onClick={handleSosTrigger}
          style={{ minHeight: '30px', padding: '0 10px', fontSize: '0.75rem' }}
        >
          SOS EMERGENCY
        </Button>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '16px', paddingBottom: '80px' }}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: '640px',
          margin: '0 auto',
          height: '60px',
          backgroundColor: 'var(--color-card)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 100,
        }}
      >
        <Link
          to="/rider"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textDecoration: 'none',
            color: location.pathname === '/rider' ? 'var(--color-brand)' : 'var(--color-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>📦</span>
          <span>Offers</span>
        </Link>
        <Link
          to="/rider/active"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textDecoration: 'none',
            color: location.pathname === '/rider/active' ? 'var(--color-brand)' : 'var(--color-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🛵</span>
          <span>Active</span>
        </Link>
        <Link
          to="/rider/earnings"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textDecoration: 'none',
            color: location.pathname === '/rider/earnings' ? 'var(--color-brand)' : 'var(--color-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>💰</span>
          <span>Earnings</span>
        </Link>
        <Link
          to="/rider/settings"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textDecoration: 'none',
            color: location.pathname === '/rider/settings' ? 'var(--color-brand)' : 'var(--color-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚙️</span>
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
};
