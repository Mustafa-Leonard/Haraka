import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitch: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('sw') ? 'sw' : 'en';

  const toggleLanguage = () => {
    const next = currentLang === 'en' ? 'sw' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggleLanguage}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        minHeight: '36px',
        fontSize: '0.85rem',
        fontWeight: 700,
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-input-bg)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
      }}
      aria-label="Switch language between English and Swahili"
    >
      🌐 {currentLang === 'en' ? 'SW' : 'EN'}
    </button>
  );
};
