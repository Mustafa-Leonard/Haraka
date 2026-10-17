import en from './locales/en.json';
import sw from './locales/sw.json';

export const resources = {
  en: { translation: en },
  sw: { translation: sw },
} as const;

export type SupportedLanguage = 'en' | 'sw';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export { en, sw };
