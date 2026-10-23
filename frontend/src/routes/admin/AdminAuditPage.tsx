import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { apiClient } from '@haraka/api-client';
import { LockKeyhole } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  RIDER_APPROVE: '#FF6A1F',
  RIDER_SUSPEND: '#EF4444',
  JOB_CANCEL: '#EF4444',
  JOB_ASSIGN: '#3B82F6',
  PRICING_UPDATE: '#F59E0B',
  ADMIN_LOGIN: '#6366F1',
  SESSION_REVOKE: '#EF4444',
  OTP_REQUEST: '#6B7280',
  DISPUTE_RESOLVE: '#FF6A1F',
  DISPUTE_ESCALATE: '#F59E0B',
};

export const AdminAuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, filterAction, filterOutcome],
    queryFn: () =>
      apiClient.adminGetAuditLogs(page, PAGE_SIZE, filterAction || undefined, filterOutcome || undefined),
    placeholderData: (prev) => prev,
  });

  const filtered = (data?.data ?? []).filter((log: any) => {
    if (!search) return true;
    return (
      (log.actorId ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (log.action ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (log.resource ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (log.resourceId ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Security Audit Logs
        </h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
          Immutable record of all privileged actions. Entries cannot be modified or deleted.
        </p>
      </div>

      {/* Filters */}
      <Card style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          placeholder="Search actor, action, resource…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', marginBottom: 0 }}
        />
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '0.88rem',
          }}
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={filterOutcome}
          onChange={(e) => { setFilterOutcome(e.target.value); setPage(1); }}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '0.88rem',
          }}
        >
          <option value="">All Outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="denied">Denied</option>
        </select>
      </Card>

      {/* Log Table */}
      {isLoading && <p style={{ color: 'var(--color-muted)' }}>Loading audit logs…</p>}

      <Card style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '750px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
              {['Timestamp (EAT)', 'Actor', 'Action', 'Resource', 'Resource ID', 'IP', 'Outcome'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '11px 14px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: 'var(--color-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log: any, idx: number) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  background: idx % 2 === 0 ? 'transparent' : 'var(--color-surface-alt)',
                }}
              >
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'var(--color-muted)' }}>
                  {new Date(log.createdAt).toLocaleString('en-KE', {
                    timeZone: 'Africa/Nairobi',
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {log.actorId?.slice(0, 8)}…
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: ACTION_COLORS[log.action]
                        ? ACTION_COLORS[log.action] + '22'
                        : 'var(--color-surface-alt)',
                      color: ACTION_COLORS[log.action] ?? 'var(--color-text)',
                    }}
                  >
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--color-muted)' }}>{log.resource}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {log.resourceId ? `${log.resourceId.slice(0, 8)}…` : '—'}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                  {log.ipAddress ?? '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background:
                        log.outcome === 'success'
                          ? 'rgba(255,106,31,0.12)'
                          : log.outcome === 'failure'
                          ? 'rgba(239,68,68,0.12)'
                          : 'rgba(107,114,128,0.12)',
                      color:
                        log.outcome === 'success'
                          ? 'var(--color-brand)'
                          : log.outcome === 'failure'
                          ? 'var(--color-danger)'
                          : 'var(--color-muted)',
                    }}
                  >
                    {log.outcome?.toUpperCase() ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--color-muted)' }}>
                  No audit logs matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      {data?.meta && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--color-muted)' }}>
            Showing {filtered.length} of {data.meta.total} entries
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: '7px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-text)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              ← Prev
            </button>
            <button
              disabled={!data.meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '7px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-text)',
                cursor: !data.meta.hasNext ? 'not-allowed' : 'pointer',
                opacity: !data.meta.hasNext ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', textAlign: 'center' }}>
        <LockKeyhole size={14} aria-hidden="true" /> Audit log entries are immutable; modification and deletion are disabled.
      </p>
    </div>
  );
};
