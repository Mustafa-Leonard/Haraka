import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';
import { Ban, Bike, Check, Package, RotateCcw, Star } from 'lucide-react';
import { useAuthStore } from '../../services/auth.store';

const verificationColors: Record<string, 'orange' | 'amber' | 'slate' | 'blue' | 'red'> = {
  PENDING: 'amber',
  UNDER_REVIEW: 'blue',
  APPROVED: 'orange',
  REJECTED: 'red',
  SUSPENDED: 'red',
};

const onlineColors: Record<string, 'orange' | 'amber' | 'slate' | 'blue' | 'red'> = {
  ONLINE: 'orange',
  ON_JOB: 'blue',
  OFFLINE: 'slate',
};

export const AdminRidersPage: React.FC = () => {
  const { user } = useAuthStore();
  const canManageSuspensions = user?.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [suspendRiderId, setSuspendRiderId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendError, setSuspendError] = useState('');
  const [rejectRiderId, setRejectRiderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [actionError, setActionError] = useState('');
  const qc = useQueryClient();

  const {
    data: riders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-riders', filterStatus],
    queryFn: () => apiClient.adminGetRiders(filterStatus || undefined),
  });

  const approveMutation = useMutation({
    mutationFn: (riderId: string) => apiClient.approveRider(riderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-riders'] }),
    onError: (err: any) => setActionError(err?.response?.data?.message || 'Rider approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ riderId, reason }: { riderId: string; reason: string }) =>
      apiClient.rejectRider(riderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-riders'] });
      setRejectRiderId(null);
      setRejectReason('');
      setRejectError('');
    },
    onError: (err: any) => setRejectError(err?.response?.data?.message || 'Rejection failed'),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ riderId, reason }: { riderId: string; reason: string }) =>
      apiClient.suspendRider(riderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-riders'] });
      setSuspendRiderId(null);
      setSuspendReason('');
      setSuspendError('');
    },
    onError: (err: any) => setSuspendError(err?.response?.data?.message || 'Suspension failed'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (riderId: string) => apiClient.reactivateRider(riderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-riders'] }),
    onError: (err: any) =>
      setActionError(err?.response?.data?.message || 'Rider reactivation failed'),
  });

  const filtered = (riders ?? []).filter(
    (r: any) =>
      !search ||
      (r.displayName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.phone ?? '').includes(search),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Rider Verification
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          {canManageSuspensions
            ? 'Review onboarding applications, approve or reject riders, and manage suspensions.'
            : 'Review onboarding applications and approve or reject eligible riders.'}
        </p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid',
              borderColor: filterStatus === s ? 'var(--color-brand)' : 'var(--color-border)',
              background: filterStatus === s ? 'var(--color-brand)' : 'transparent',
              color: filterStatus === s ? '#fff' : 'var(--color-text)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
        <button
          onClick={() => setFilterStatus('')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-full)',
            border: '1.5px solid',
            borderColor: filterStatus === '' ? 'var(--color-brand)' : 'var(--color-border)',
            background: filterStatus === '' ? 'var(--color-brand)' : 'transparent',
            color: filterStatus === '' ? '#fff' : 'var(--color-text)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          All
        </button>
      </div>

      <Input
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Suspend confirmation */}
      {suspendRiderId && (
        <Card style={{ padding: '20px', border: '2px solid var(--color-danger)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--color-danger)' }}>
            Confirm Rider Suspension
          </h3>
          <Input
            label="Reason for suspension (required)"
            placeholder="Describe the reason…"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
          />
          {suspendError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '8px' }}>
              {suspendError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="danger"
              disabled={!suspendReason.trim() || suspendMutation.isPending}
              onClick={() =>
                suspendMutation.mutate({ riderId: suspendRiderId, reason: suspendReason })
              }
            >
              {suspendMutation.isPending ? 'Suspending…' : 'Suspend Rider'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSuspendRiderId(null);
                setSuspendError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {rejectRiderId && (
        <Card style={{ padding: '20px', border: '2px solid var(--color-danger)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--color-danger)' }}>
            Reject Rider Application
          </h3>
          <Input
            label="Reason for rejection (required)"
            placeholder="Explain what needs to be corrected…"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          {rejectError && (
            <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>
              {rejectError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="danger"
              disabled={rejectReason.trim().length < 3 || rejectMutation.isPending}
              onClick={() =>
                rejectMutation.mutate({ riderId: rejectRiderId, reason: rejectReason.trim() })
              }
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Reject Application'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setRejectRiderId(null);
                setRejectReason('');
                setRejectError('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {actionError && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>
          {actionError}
        </p>
      )}

      {isLoading && <p style={{ color: 'var(--color-muted)' }}>Loading riders…</p>}
      {error && <p style={{ color: 'var(--color-danger)' }}>Failed to load riders.</p>}

      {!isLoading && filtered.length === 0 && (
        <Card style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
          No riders found with this filter.
        </Card>
      )}

      {filtered.map((rider: any) => (
        <Card
          key={rider.id}
          style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 300px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                }}
              >
                {(rider.displayName?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {rider.displayName ?? 'Unknown Rider'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                  {rider.phone}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <StatusPill
                status={rider.verificationStatus}
                color={verificationColors[rider.verificationStatus] ?? 'slate'}
              />
              <StatusPill
                status={rider.onlineStatus}
                color={onlineColors[rider.onlineStatus] ?? 'slate'}
              />
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              <Bike size={14} aria-hidden="true" />{' '}
              {rider.primaryVehicle?.type ?? 'Vehicle not set'} &nbsp;|&nbsp;
              <Star size={14} aria-hidden="true" /> {rider.averageRating?.toFixed(1) ?? 'N/A'}{' '}
              &nbsp;|&nbsp;
              <Package size={14} aria-hidden="true" /> {rider.totalDeliveries ?? 0} deliveries
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              Joined:{' '}
              {rider.createdAt ? new Date(rider.createdAt).toLocaleDateString('en-KE') : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {(rider.verificationStatus === 'PENDING' ||
              rider.verificationStatus === 'UNDER_REVIEW') && (
              <>
                <Button
                  size="sm"
                  disabled={approveMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Approve rider ${rider.displayName}?`)) {
                      approveMutation.mutate(rider.id);
                    }
                  }}
                >
                  {approveMutation.isPending ? (
                    '…'
                  ) : (
                    <>
                      <Check size={14} aria-hidden="true" /> Approve
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setRejectRiderId(rider.id);
                    setRejectReason('');
                    setRejectError('');
                  }}
                >
                  Reject
                </Button>
              </>
            )}

            {canManageSuspensions && rider.verificationStatus === 'APPROVED' && (
              <Button size="sm" variant="danger" onClick={() => setSuspendRiderId(rider.id)}>
                <Ban size={14} aria-hidden="true" /> Suspend
              </Button>
            )}

            {canManageSuspensions && rider.verificationStatus === 'SUSPENDED' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={reactivateMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Re-activate rider ${rider.displayName}?`)) {
                    reactivateMutation.mutate(rider.id);
                  }
                }}
              >
                <RotateCcw size={14} aria-hidden="true" />{' '}
                {reactivateMutation.isPending ? 'Reactivating…' : 'Re-activate'}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
