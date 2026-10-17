import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../services/auth.store';

export const PublicLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handlePortalRedirect = () => {
    if (!user) return navigate('/login');
    if (user.roles.includes('MERCHANT')) navigate('/merchant');
    else if (user.roles.includes('RIDER')) navigate('/rider');
    else if (user.roles.includes('ADMIN') || user.roles.includes('DISPATCHER')) navigate('/admin');
    else navigate('/merchant');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
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

          <nav style={{ display: 'flex', gap: '20px' }}>
            <Link to="/pricing" style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: '0.95rem' }}>
              {t('nav.pricing')}
            </Link>
            <Link to="/how-it-works" style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: '0.95rem' }}>
              {t('nav.howItWorks')}
            </Link>
            <Link to="/coverage" style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: '0.95rem' }}>
              {t('nav.coverage')}
            </Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: 'var(--color-card)',
          borderTop: '1px solid var(--color-border)',
          padding: '40px 24px',
          color: 'var(--color-muted)',
          fontSize: '0.9rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-ink)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
              Haraka Logistics
            </div>
            <p>Fast, on-demand parcel logistics connecting Kilifi, Malindi, and Mombasa.</p>
            <p style={{ marginTop: '8px' }}>Pwani, Kenya • Tel: +254 700 000 000</p>
          </div>
          <div style={{ display: 'flex', gap: '40px' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '10px' }}>Zones</div>
              <p>Kilifi Town</p>
              <p>Malindi</p>
              <p>Mombasa</p>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '10px' }}>Portals</div>
              <p><Link to="/merchant" style={{ color: 'var(--color-muted)' }}>Merchant Portal</Link></p>
              <p><Link to="/rider" style={{ color: 'var(--color-muted)' }}>Rider PWA</Link></p>
              <p><Link to="/admin" style={{ color: 'var(--color-muted)' }}>Operations Dispatch</Link></p>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '30px auto 0', borderTop: '1px solid var(--color-border)', paddingTop: '20px', textAlign: 'center', fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} Haraka Logistics Ltd. All rights reserved. Compliant with Kenya Data Protection Act 2019.
        </div>
      </footer>
    </div>
  );
};
