import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusPill } from '../../components/ui/StatusPill';
import { apiClient } from '@haraka/api-client';

const statusColors: Record<string, 'orange' | 'amber' | 'slate' | 'blue' | 'red'> = {
  OPEN: 'amber',
  UNDER_REVIEW: 'blue',
  RESOLVED: 'slate',
  CLOSED: 'slate',
  ESCALATED: 'red',
};

export const AdminDisputesPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  const qc = useQueryClient();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes', filterStatus],
    queryFn: () => apiClient.adminGetDisputes(filterStatus || undefined),
  });

  const { data: activeDispute } = useQuery({
    queryKey: ['admin-dispute', activeId],
    queryFn: () => (activeId ? apiClient.adminGetDispute(activeId) : null),
    enabled: !!activeId,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiClient.adminResolveDispute(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-disputes'] });
      qc.invalidateQueries({ queryKey: ['admin-dispute', activeId] });
      setResolution('');
      setResolutionError('');
      setActiveId(null);
    },
    onError: (err: any) => setResolutionError(err?.response?.data?.message || 'Resolution failed'),
  });

  const escalateMutation = useMutation({
    mutationFn: (id: string) => apiClient.adminEscalateDispute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-disputes'] });
      qc.invalidateQueries({ queryKey: ['admin-dispute', activeId] });
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Disputes &amp; Exceptions
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          Review, investigate, and resolve delivery disputes from merchants, riders, and recipients.
        </p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['OPEN', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED', ''].map((s, i) => (
          <button
            key={s || 'ALL'}
            onClick={() => { setFilterStatus(s); setActiveId(null); }}
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
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeId ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isLoading && <p style={{ color: 'var(--color-muted)' }}>Loading disputes…</p>}
          {!isLoading && (disputes ?? []).length === 0 && (
            <Card style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
              No disputes with status "{filterStatus || 'any'}".
            </Card>
          )}
          {(disputes ?? []).map((d: any) => (
            <Card
              key={d.id}
              style={{
                padding: '18px 20px',
                cursor: 'pointer',
                border: activeId === d.id ? '2px solid var(--color-brand)' : '1px solid var(--color-border)',
              }}
              onClick={() => setActiveId(d.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  #{d.jobReferenceCode ?? d.jobId?.slice(0, 8)}
                </span>
                <StatusPill status={d.status} color={statusColors[d.status] ?? 'slate'} />
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                {d.category}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '6px' }}>
                {d.description?.slice(0, 100)}{d.description?.length > 100 ? '…' : ''}
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                Opened: {new Date(d.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium' })}
                &nbsp;· Filed by: {d.filedBy ?? 'Unknown'}
              </div>
            </Card>
          ))}
        </div>

        {/* Detail panel */}
        {activeId && activeDispute && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
                    {activeDispute.category}
                  </h3>
                  <StatusPill status={activeDispute.status} color={statusColors[activeDispute.status] ?? 'slate'} />
                </div>
                <button
                  onClick={() => setActiveId(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-muted)' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', marginBottom: '18px' }}>
                <p><strong>Job:</strong> #{activeDispute.jobReferenceCode}</p>
                <p><strong>Filed by:</strong> {activeDispute.filedBy}</p>
                <p><strong>Opened:</strong> {new Date(activeDispute.createdAt).toLocaleString('en-KE')}</p>
                <p style={{ marginTop: '6px', lineHeight: 1.6 }}>{activeDispute.description}</p>
              </div>

              {activeDispute.resolutionNote && (
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    marginBottom: '14px',
                  }}
                >
                  <strong>Resolution:</strong> {activeDispute.resolutionNote}
                </div>
              )}

              {/* Actions */}
              {['OPEN', 'UNDER_REVIEW'].includes(activeDispute.status) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input
                    label="Resolution note (required)"
                    placeholder="Describe how this dispute was resolved…"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                  {resolutionError && (
                    <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{resolutionError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button
                      disabled={!resolution.trim() || resolveMutation.isPending}
                      onClick={() => resolveMutation.mutate({ id: activeId!, note: resolution })}
                    >
                      {resolveMutation.isPending ? 'Resolving…' : '✓ Mark Resolved'}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={escalateMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Escalate this dispute?')) {
                          escalateMutation.mutate(activeId!);
                        }
                      }}
                    >
                      {escalateMutation.isPending ? '…' : '⬆ Escalate'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
