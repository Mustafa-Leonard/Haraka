import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, style, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-ink)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          style={{
            minHeight: '44px',
            padding: '0 14px',
            fontSize: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-input-bg)',
            color: 'var(--color-ink)',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-input-border)'}`,
            outline: 'none',
            transition: 'border-color var(--transition-base)',
            ...style,
          }}
          {...props}
        />
        {error && <span style={{ fontSize: '0.8rem', color: 'var(--color-error)', fontWeight: 500 }}>{error}</span>}
        {helperText && !error && (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{helperText}</span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
