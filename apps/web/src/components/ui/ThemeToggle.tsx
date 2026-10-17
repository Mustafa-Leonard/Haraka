import React from 'react';
import { useThemeStore } from '../../services/theme.store';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-input-bg)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        fontSize: '1.1rem',
      }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};
