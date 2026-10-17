# AGENTS.md — Haraka Coding Agent Instructions

This file governs ALL coding agents working on Haraka. Read this before modifying any file.

## Project Identity
- **Name**: Haraka ("quick" in Swahili)
- **Type**: On-demand delivery and logistics platform
- **Primary market**: Kilifi, Malindi, Mombasa — coastal Kenya
- **Repo root**: The directory containing this file

## Non-Negotiable Rules

1. **Read context documents first.** Before modifying any module, read the relevant docs in `docs/`.
2. **No fabrication.** Never claim tests pass if they were not run. Never fake API/payment/SMS/GPS responses in production paths.
3. **No placeholder pages.** Every UI control must connect to a real API. No buttons that do nothing.
4. **No hardcoded mock responses** for core features. Use sandbox adapters labeled as sandbox.
5. **No secrets in commits.** Use `.env` files that are gitignored.
6. **No silent requirement conflicts.** If code contradicts docs, determine intended behavior, record the decision, update both.
7. **Never delete working code or uncommitted changes** without justification.
8. **Update `docs/IMPLEMENTATION_STATUS.md`** after every significant change.

## Architecture Rules

- pnpm workspaces monorepo
- Strict TypeScript everywhere
- NestJS + Fastify adapter for API
- Prisma ORM + PostGIS for database
- React 18 + Vite for frontend
- Single authoritative state machine for job transitions in backend
- Never trust frontend-supplied prices, distances, or payment outcomes
- Authorization enforced server-side for every protected operation
- Deny-by-default RBAC
- Double-entry ledger — every financial movement has balanced debit/credit entries
- Outbox pattern for all notifications

## File Precedence (highest to lowest)
1. `docs/PRODUCT_SPEC.md` — business rules
2. Accepted architecture + security decisions
3. Database and API contracts
4. Shared types, schemas, generated API specs
5. Implemented code + passing tests
6. UI assumptions and informal notes

## Workflow for Every Feature
1. Read relevant context docs
2. Identify dependencies and existing implementations
3. Define acceptance tests
4. Design DB changes + API contracts first
5. Implement backend + authorization
6. Implement frontend + user feedback
7. Integrate background jobs + external services
8. Add unit, integration, auth, and E2E tests
9. Run: format, lint, type-check, tests, build
10. Fix ALL failures
11. Update `docs/IMPLEMENTATION_STATUS.md`
12. Record architectural changes in `docs/DECISIONS.md`

## Technology Stack
- **Runtime**: Node.js 22 LTS (24.x detected on this machine)
- **Backend**: NestJS + Fastify, TypeScript strict, Prisma, Redis, BullMQ, Pino, Zod, Argon2id, JWT+refresh
- **Frontend**: React 18, Vite, TypeScript, React Router, TanStack Query, Zustand, RHF, Zod, Leaflet, i18next
- **DB**: PostgreSQL 16 + PostGIS, Redis 7
- **Testing**: Vitest, Supertest, Playwright, k6
- **Money**: Integer minor units (KES×100 = fils). Never floats for money.
- **Coordinates**: PostGIS geography(Point,4326). Validate ranges before insert.
- **Timezone**: Africa/Nairobi (EAT, UTC+3)

## Module Boundaries
```
apps/api/src/
  auth/ users/ merchants/ riders/ vehicles/ addresses/
  jobs/ dispatch/ tracking/ pricing/ payments/ ledger/
  payouts/ notifications/ disputes/ ratings/ reports/
  admin/ audit/ privacy/ health/ common/
apps/worker/
apps/web/src/
  app/ layouts/ routes/ features/ components/ hooks/
  services/ offline/ main.tsx
packages/
  database/ shared-types/ validation/ api-client/
  theme/ i18n/ config/
```

## Money Rules
- Use integer KES minor units (1 KES = 100 minor units)
- Never use floats for monetary arithmetic
- Always store currency code explicitly
- Use round-half-up rounding consistently

## Security Reminders
- OTP: cryptographically secure, short-lived, single-use, rate-limited, non-enumerating errors
- Passwords: Argon2id only
- Sessions: short-lived JWT + rotating refresh in httpOnly cookies
- Admin: TOTP MFA required
- CORS: configured origins only
- CSRF: double-submit cookie pattern for cookie-authenticated requests
- Uploads: file type + size validation, private storage, signed URLs
- Never log: phone numbers, national IDs, OTPs, PINs, session tokens, payment credentials

## On Session End
Before stopping:
1. Update `docs/IMPLEMENTATION_STATUS.md`
2. Record last working git commit/ref
3. List completed acceptance criteria with test evidence
4. List remaining tasks in dependency order
5. Identify failing tests with actual error messages
6. State the exact next action to continue

Do NOT regenerate the project from scratch after a context reset. Read context docs and git status first.
