import React from 'react';
import type { JobStatus } from '@haraka/shared-types';

interface StatusPillProps {
  status: JobStatus | string;
  label?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, label }) => {
  const getStyle = (): { bg: string; color: string; border: string } => {
    switch (status) {
      case 'REQUESTED':
      case 'MATCHING':
        return { bg: '#FFF0E8', color: '#FF6A1F', border: '#FFD4BE' }; // Brand orange
      case 'OFFERED':
      case 'ACCEPTED':
        return { bg: '#EEF4FF', color: '#2F6FE4', border: '#C6DCFF' }; // Merchant blue
      case 'ARRIVED_PICKUP':
      case 'PICKED_UP':
      case 'IN_TRANSIT':
      case 'ARRIVED_DROPOFF':
        return { bg: '#FFFAEB', color: '#B45309', border: '#FDE68A' }; // Rider amber
      case 'DELIVERED':
      case 'COMPLETED':
        return { bg: '#FFF0E8', color: '#C2410C', border: '#FF6A1F' }; // Completed (deep orange - NO GREEN)
      case 'CANCELLED':
      case 'FAILED':
        return { bg: '#FEF0F0', color: '#D64545', border: '#FCA5A5' }; // Error red
      case 'DISPUTED':
        return { bg: '#F1F5F9', color: '#334155', border: '#94A3B8' }; // Slate
      default:
        return { bg: 'var(--color-bg)', color: 'var(--color-muted)', border: 'var(--color-border)' };
    }
  };

  const { bg, color, border } = getStyle();
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: '0.75rem',
        fontWeight: 700,
        borderRadius: 'var(--radius-full)',
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {displayLabel}
    </span>
  );
};
