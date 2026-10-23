import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../services/auth.store';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@haraka/api-client';

export const RiderSettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['rider-profile'],
    queryFn: () => apiClient.getRiderProfile(),
  });

  const verificationLabel = profile?.verificationStatus
    ? profile.verificationStatus.replaceAll('_', ' ')
    : 'Unknown';

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

      {isLoading && <p role="status">Loading your rider profile…</p>}
      {isError && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          Your rider profile could not be loaded. Please try again later.
        </p>
      )}
      {profile && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Verification Status:
            </span>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor:
                  profile.verificationStatus === 'APPROVED' ? '#FFF0E8' : 'var(--color-bg)',
                color: 'var(--color-ink)',
              }}
            >
              {verificationLabel}
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Rider Name</div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>
              {profile.displayName || user?.displayName || 'Rider Profile'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Registered Phone</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{profile.phone}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Assigned Vehicle</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-brand)' }}>
              {profile.primaryVehicle
                ? `${profile.primaryVehicle.type} · ${profile.primaryVehicle.plateNumber}`
                : 'No vehicle assigned'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              Completed deliveries
            </div>
            <div style={{ fontWeight: 600 }}>{profile.totalDeliveries}</div>
          </div>
        </Card>
      )}

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Account Security</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          Rider sessions are cryptographically signed with short-lived tokens and rotating refresh
          cookies.
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
