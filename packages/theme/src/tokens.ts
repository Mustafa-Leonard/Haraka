// =============================================================================
// HARAKA DESIGN TOKENS
// Single source of truth for all brand colors, typography, spacing, and radii.
// These values are consumed by the CSS custom properties in styles/tokens.css
// and available as JS constants for canvas/SVG rendering.
// =============================================================================

export const colors = {
  // Brand
  brand: '#FF6A1F',
  brandHover: '#E55C10',
  brandSubtle: '#FFF0E8',

  // Role colors
  merchant: '#2F6FE4',
  rider: '#F5B301',
  admin: '#2B3440',

  // Semantic
  error: '#D64545',
  errorSubtle: '#FEF0F0',
  warning: '#F5B301',
  warningSubtle: '#FFFAEB',
  info: '#2F6FE4',
  infoSubtle: '#EEF4FF',

  // Light theme
  light: {
    bg: '#F4F2EF',
    card: '#FFFFFF',
    ink: '#1D232B',
    muted: '#68717C',
    border: '#E4E0DA',
    divider: '#ECE9E3',
    overlay: 'rgba(29, 35, 43, 0.5)',
  },

  // Dark theme
  dark: {
    bg: '#14181D',
    card: '#1D232B',
    ink: '#F1EFEC',
    muted: '#9AA3AD',
    border: '#2B333D',
    divider: '#232B33',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export const typography = {
  fontHeading: "'Sora', system-ui, sans-serif",
  fontBody: "'DM Sans', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",

  scale: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  lineHeight: {
    tight: '1.2',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
} as const;

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '16px',   // card radius per spec
  xl: '20px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
} as const;

export const transitions = {
  fast: '100ms ease',
  base: '150ms ease',
  slow: '250ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

// Control minimum touch target size (WCAG 2.5.5)
export const minTouchTarget = '44px';

// Card defaults from spec
export const cardDefaults = {
  radius: radius.lg,
  border: '1px solid',
  padding: '1rem', // ~16px
} as const;

// Re-export as default theme object
const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  transitions,
  breakpoints,
  zIndex,
  minTouchTarget,
  cardDefaults,
} as const;

export default theme;
