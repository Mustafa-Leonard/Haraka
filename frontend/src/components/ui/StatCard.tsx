import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon }) => {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)' }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--color-brand)' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
        {value}
      </div>
      {subValue && (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          {subValue}
        </span>
      )}
    </Card>
  );
};
