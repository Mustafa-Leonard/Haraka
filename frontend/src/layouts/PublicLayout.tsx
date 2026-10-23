import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';
import { Menu, X } from 'lucide-react';
import { getStaffHomePath, isStaffPortalRole } from '@haraka/shared-types';

export const PublicLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePortalRedirect = () => {
    if (!user) return navigate('/login');
    if (user.roles.includes('MERCHANT')) navigate('/merchant');
    else if (user.roles.includes('RIDER')) navigate('/rider');
    else if (user.roles.some((role) => isStaffPortalRole(role))) {
      navigate(getStaffHomePath(user.roles));
    } else navigate('/merchant');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Header */}
      <header
        className={`public-header${isMenuOpen ? ' is-open' : ''}`}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'var(--color-card)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          className="public-header-brand"
          style={{ display: 'flex', alignItems: 'center', gap: '32px' }}
        >
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '22px',
                fontFamily: 'var(--font-heading)',
                transform: 'rotate(-8deg)',
              }}
            >
              H
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.4rem',
                color: 'var(--color-ink)',
                letterSpacing: '-0.5px',
              }}
            >
              haraka
            </span>
          </Link>

          <nav className="public-nav" style={{ display: 'flex', gap: '20px' }}>
            <Link
              to="/pricing"
              style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: '0.95rem' }}
            >
              {t('nav.pricing')}
            </Link>
            <Link
              to="/how-it-works"
              style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: '0.95rem' }}
            >
              {t('nav.howItWorks')}
            </Link>
            <Link
              to="/coverage"
              style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: '0.95rem' }}
            >
              {t('nav.coverage')}
            </Link>
          </nav>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div
          className="public-header-controls"
          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <LanguageSwitch />
          <ThemeToggle />

          {isAuthenticated ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button size="sm" onClick={handlePortalRedirect}>
                {t('nav.dashboard')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => logout()}>
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button size="sm" variant="secondary" onClick={() => navigate('/login')}>
                {t('nav.login')}
              </Button>
              <Button size="sm" onClick={() => navigate('/login?mode=register')}>
                {t('nav.register')}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="public-main" style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className="public-footer"
        style={{
          backgroundColor: 'var(--color-card)',
          borderTop: '1px solid var(--color-border)',
          padding: '40px 24px',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
        }}
      >
        <div
          className="public-footer-content"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '1.2rem',
                color: 'var(--color-ink)',
                marginBottom: '8px',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Haraka Logistics
            </div>
            <p>Fast, on-demand parcel logistics connecting Kilifi, Malindi, and Mombasa.</p>
            <p style={{ marginTop: '8px' }}>Coastal Kenya</p>
          </div>
          <div className="public-footer-links" style={{ display: 'flex', gap: '40px' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '10px' }}>
                Zones
              </div>
              <p>Kilifi Town</p>
              <p>Malindi</p>
              <p>Mombasa</p>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '10px' }}>
                Portals
              </div>
              <p>
                <Link to="/merchant" style={{ color: 'var(--color-muted)' }}>
                  Merchant Portal
                </Link>
              </p>
              <p>
                <Link to="/rider" style={{ color: 'var(--color-muted)' }}>
                  Rider PWA
                </Link>
              </p>
              <p>
                <Link to="/admin" style={{ color: 'var(--color-muted)' }}>
                  Operations Dispatch
                </Link>
              </p>
            </div>
          </div>
        </div>
        <div
          style={{
            maxWidth: '1200px',
            margin: '30px auto 0',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '20px',
            textAlign: 'center',
            fontSize: '0.8rem',
          }}
        >
          Copyright {new Date().getFullYear()} Haraka Logistics Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
