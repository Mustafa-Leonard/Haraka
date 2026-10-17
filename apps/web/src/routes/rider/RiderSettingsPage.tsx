import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../services/auth.store';
import { useNavigate } from 'react-router-dom';

export const RiderSettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Rider Account & Verification
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          Personal credentials, registered vehicle, and verification status.
        </p>
      </div>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Verification Status:</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#FFF0E8', color: '#C2410C' }}>
            ✓ APPROVED RIDER
          </span>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Rider Name</div>
          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{user?.displayName || 'Juma Kazungu'}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Registered Phone</div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user?.phone || '+254 722 000 002'}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Assigned Vehicle</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-brand)' }}>
            KMDF 123X • Boxer BM 150 (Boda)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Operating Base Zone</div>
          <div style={{ fontWeight: 600 }}>Kilifi Town Corridor</div>
        </div>
      </Card>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Account Security</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          Rider sessions are cryptographically signed with short-lived tokens and rotating refresh cookies.
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          Sign Out of Rider PWA
        </Button>
      </Card>
    </div>
  );
};
