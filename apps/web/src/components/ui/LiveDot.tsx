import React from 'react';

interface LiveDotProps {
  isLive: boolean;
  label?: string;
}

export const LiveDot: React.FC<LiveDotProps> = ({ isLive, label }) => {
  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      role="status"
      aria-live="polite"
    >
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isLive ? 'var(--color-brand)' : 'var(--color-muted)',
          boxShadow: isLive ? '0 0 0 2px rgba(255, 106, 31, 0.3)' : 'none',
        }}
      />
      {label && (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)' }}>
          {label}
        </span>
      )}
    </div>
  );
};
