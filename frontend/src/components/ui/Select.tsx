import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, style, ...props }, ref) => {
    const selectId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {label && (
          <label htmlFor={selectId} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          style={{
            minHeight: '44px',
            padding: '0 14px',
            fontSize: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-input-bg)',
            color: 'var(--color-ink)',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-input-border)'}`,
            outline: 'none',
            ...style,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span style={{ fontSize: '0.8rem', color: 'var(--color-error)' }}>{error}</span>}
      </div>
    );
  },
);

Select.displayName = 'Select';
