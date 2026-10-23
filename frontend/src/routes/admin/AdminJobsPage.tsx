import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';
import { useAuthStore } from '../../services/auth.store';
import { CreditCard, MapPin, UserRound, Zap } from 'lucide-react';
import type { JobSummaryDto } from '@haraka/shared-types';

const PAGE_SIZE = 20;

const statusColors: Record<string, 'orange' | 'amber' | 'slate' | 'blue' | 'red'> = {
  REQUESTED: 'amber',
  MATCHING: 'amber',
  OFFERED: 'blue',
  ACCEPTED: 'blue',
  ARRIVED_PICKUP: 'blue',
  PICKED_UP: 'orange',
  IN_TRANSIT: 'orange',
  ARRIVED_DROPOFF: 'orange',
  DELIVERED: 'slate',
  CANCELLED: 'red',
  FAILED: 'red',
};

export const AdminJobsPage: React.FC = () => {
  const { user } = useAuthStore();
  const canManageJobs = user?.roles.some((role) =>
    ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'].includes(role),
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [assignJobId, setAssignJobId] = useState<string | null>(null);
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-jobs', page, filterStatus],
    queryFn: () => apiClient.adminGetJobs(page, PAGE_SIZE, filterStatus || undefined),
    placeholderData: (prev) => prev,
  });

  const assignMutation = useMutation({
    mutationFn: ({ jobId, riderId }: { jobId: string; riderId: string }) =>
      apiClient.adminAssignJob(jobId, riderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-jobs'] });
      setAssignJobId(null);
      setAssignRiderId('');
      setAssignError('');
    },
    onError: (err: any) => {
      setAssignError(err?.response?.data?.message || 'Assignment failed');
    },
  });

  const forceCancelMutation = useMutation({
    mutationFn: (jobId: string) => apiClient.adminCancelJob(jobId, 'Admin forced cancellation'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-jobs'] }),
    onError: (err: any) =>
      setCancelError(err?.response?.data?.message || 'Job cancellation failed'),
  });

  const filtered = (data?.data ?? []).filter(
    (j) =>
      !search ||
      j.referenceCode.toLowerCase().includes(search.toLowerCase()) ||
      j.recipientName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          All Deliveries
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          {canManageJobs
            ? 'Monitor, assign, and manage deliveries across all zones.'
            : 'View delivery status and details across all zones.'}
        </p>
      </div>

      {/* Filters */}
      <Card
        style={{
          padding: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Input
          placeholder="Search by code or recipient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', marginBottom: 0 }}
        />
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '0.9rem',
          }}
        >
          <option value="">All Statuses</option>
          {[
            'REQUESTED',
            'MATCHING',
            'OFFERED',
            'ACCEPTED',
            'ARRIVED_PICKUP',
            'PICKED_UP',
            'IN_TRANSIT',
            'ARRIVED_DROPOFF',
            'DELIVERED',
            'CANCELLED',
            'FAILED',
          ].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </Card>

      {/* Manual Assign Modal */}
      {canManageJobs && assignJobId && (
        <Card style={{ padding: '20px', border: '2px solid var(--color-brand)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>Manually Assign Job</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '12px' }}>
            Job ID: <code>{assignJobId}</code>
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Input
              label="Rider ID"
              placeholder="Enter approved rider UUID"
              value={assignRiderId}
              onChange={(e) => setAssignRiderId(e.target.value)}
              style={{ flex: '1 1 280px', marginBottom: 0 }}
            />
            <Button
              disabled={!assignRiderId.trim() || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({ jobId: assignJobId, riderId: assignRiderId.trim() })
              }
            >
              {assignMutation.isPending ? 'Assigning…' : 'Confirm Assignment'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAssignJobId(null);
                setAssignError('');
              }}
            >
              Cancel
            </Button>
          </div>
          {assignError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '8px' }}>
              {assignError}
            </p>
          )}
        </Card>
      )}

      {cancelError && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>
          {cancelError}
        </p>
      )}

      {/* Jobs Table */}
      {isLoading && <p style={{ color: 'var(--color-muted)' }}>Loading deliveries…</p>}
      {error && (
        <p style={{ color: 'var(--color-danger)' }}>
          Failed to load deliveries. Check API connection.
        </p>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
          No deliveries found matching your filters.
        </Card>
      )}

      {filtered.map((job) => (
        <Card
          key={job.id}
          style={{
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 300px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>
                #{job.referenceCode}
              </span>
              <StatusPill status={job.status} color={statusColors[job.status] ?? 'slate'} />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                {job.vehicleType}
              </span>
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-muted)' }}>
              <MapPin size={14} aria-hidden="true" /> {job.pickupTown} → {job.dropoffTown}{' '}
              &nbsp;|&nbsp;
              <UserRound size={14} aria-hidden="true" /> {job.recipientName} &nbsp;|&nbsp;
              <CreditCard size={14} aria-hidden="true" /> {job.paymentMethod.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '4px' }}>
              {new Date(job.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
              &nbsp;|&nbsp; KES {(job.quotedAmount / 100).toFixed(2)}
            </div>
          </div>

          {canManageJobs && (
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {['REQUESTED', 'MATCHING', 'OFFERED'].includes(job.status) && (
                <Button
                  size="sm"
                  onClick={() => {
                    setAssignJobId(job.id);
                    setAssignError('');
                  }}
                >
                  <Zap size={14} aria-hidden="true" /> Assign Rider
                </Button>
              )}
              {!['DELIVERED', 'CANCELLED', 'FAILED'].includes(job.status) && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={forceCancelMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Force-cancel job #${job.referenceCode}?`)) {
                      forceCancelMutation.mutate(job.id);
                    }
                  }}
                >
                  ✕ Cancel
                </Button>
              )}
            </div>
          )}
        </Card>
      ))}

      {/* Pagination */}
      {data && data.meta && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
          }}
        >
          <span style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>
            Page {data.meta.page} of {data.meta.totalPages} — {data.meta.total} total jobs
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!data.meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
