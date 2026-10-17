# Haraka — Changelog

All notable changes to the Haraka platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-17

### Added
- Monorepo scaffold with pnpm workspaces (`apps/api`, `apps/worker`, `apps/web`, `packages/*`).
- Base configuration files: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.prettierrc`, `.gitignore`.
- Full project documentation set:
  - `AGENTS.md` (mandatory coding agent instructions)
  - `docs/PRODUCT_SPEC.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DECISIONS.md` (ADR-001 through ADR-012)
  - `docs/DATABASE.md`
  - `docs/API_CONTRACT.md`
  - `docs/SECURITY.md`
  - `docs/DESIGN_SYSTEM.md`
  - `docs/INTEGRATIONS.md`
  - `docs/TESTING.md`
  - `docs/DEPLOYMENT.md`
  - `docs/RUNBOOK.md`
  - `docs/IMPLEMENTATION_STATUS.md`
- Comprehensive `.env.example` with all configuration parameters documented.
- Complete Prisma 5 schema (`packages/database/prisma/schema.prisma`) with PostgreSQL 16 & PostGIS support covering identity, merchants, riders, vehicles, addresses, delivery jobs, pricing, payments, double-entry ledger, notifications, disputes, ratings, and audit logs.
- `@haraka/shared-types` package with complete TypeScript types for authentication, users, merchants, riders, jobs, state transitions, pricing, payments, notifications, tracking, and standard API responses.
- `@haraka/theme` package with design tokens (`src/tokens.ts`), CSS custom properties (`src/styles/index.css`), and official SVG brand assets (light, dark, icon-only, and maskable PWA icon).
- `@haraka/validation` package with Zod validation schemas for phone numbers (+254 normalization), OTP, addresses, jobs, merchant profiles, rider operations, and pricing.
- `@haraka/api` foundational application setup with Fastify adapter, OpenAPI/Swagger configuration, and root `AppModule`.
