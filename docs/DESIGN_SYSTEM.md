# Haraka — Design System & UI Specifications

## 1. Brand Identity & Typography
- **Brand Name**: Haraka ("quick" in Swahili)
- **Primary Brand Color**: `#FF6A1F` (Electric Coastal Orange)
- **Heading Font**: `Sora` (Weights: 600, 700, 800)
- **Body & UI Font**: `DM Sans` (Weights: 400, 500, 600)
- **Mono Font**: `JetBrains Mono`

> **STRICT RULE**: Green is completely prohibited across the design system. Statuses must be communicated via shape, label, icon, and compliant color combinations (Orange, Amber, Slate, Blue, and Red).

---

## 2. Color Palette & Semantic Roles

| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--color-brand` | `#FF6A1F` | `#FF6A1F` | Primary actions, branding |
| `--color-brand-hover` | `#E55C10` | `#E55C10` | Hover states |
| `--color-merchant` | `#2F6FE4` | `#3B82F6` | Merchant role accents |
| `--color-rider` | `#F5B301` | `#F59E0B` | Rider role accents |
| `--color-admin` | `#2B3440` | `#475569` | Admin role accents |
| `--color-bg` | `#F4F2EF` | `#14181D` | Global page background |
| `--color-card` | `#FFFFFF` | `#1D232B` | Card & modal surfaces |
| `--color-ink` | `#1D232B` | `#F1EFEC` | Primary text |
| `--color-muted` | `#68717C` | `#9AA3AD` | Subtitle & hint text |
| `--color-border` | `#E4E0DA` | `#2B333D` | 1px component borders |
| `--color-error` | `#D64545` | `#EF4444` | Destructive actions, errors |

---

## 3. UI Components & Tokens
- **Card radius**: `16px` (`--radius-lg`)
- **Card border**: `1px solid var(--color-border)`
- **Minimum touch target**: `44px` height on all buttons and inputs (WCAG AA compliance)
- **Live indicator**: Pulsing orange dot with accessible screen-reader status (`aria-live="polite"`)
- **Themes**: System preference detection, explicit toggle, persisted in local storage
- **Localization**: English (`en`) and Swahili (`sw`) language toggle available globally
