# Haraka Phase 1 Assessment

Assessment date: 2026-10-21  
Repository ref: `038a1bee7a72efb94204fbea8db0cce01611e29e`

## Summary

The repository has substantial backend, shared-package, migration, and frontend implementation, but it is not currently runnable end-to-end. The root unit suite passes. Workspace type-check/build fail on obsolete phone-OTP UI calls; the API compiles but does not start because PostgreSQL rejects the configured credentials. The local web server does start and serves the landing and pricing routes. No migrations, seeds, or database writes were run.

The worktree was already heavily modified before this assessment: tracked `apps/api/` and `apps/web/` files are deleted, while `backend/` and `frontend/` are untracked replacement trees. Other tracked files are modified and many new files are untracked. This assessment did not restore, remove, or alter source files. Treat the workspace layout move as unreviewed until its intent and diff are reconciled.

## Repository and tool inventory

- Root is a pnpm workspace with `backend`, `frontend`, `apps/*`, and `packages/*`; pnpm reports 10 of 11 workspace projects.
- Root scripts include recursive build/dev/lint/type-check, Vitest tests, Playwright E2E, and Prisma migration/seed scripts.
- Packages include database/Prisma, shared types, validation, API client, theme, i18n, and config.
- Five Prisma migrations are present under `packages/database/prisma/migrations/`.
- Database package scripts define `migrate:dev`, `migrate:deploy`, and `seed`. Seed and migration commands were not run.
- `docs/IMPLEMENTATION_STATUS.md` has substantial prior work notes, but parts of its latest verification do not match this assessment's current test/build/start results. Current evidence below should be used for the present baseline.
- A root `.env` and `backend/.env` exist. Their values were not copied into this report. The root and backend database URLs point to different database names. Compose requires `POSTGRES_PASSWORD`, which is not configured for the Compose invocation.
- Environment: Windows PowerShell, Node `v24.22.0` (project requires `>=22`), pnpm `9.15.4` via `pnpm.cmd`, Docker `29.9.1`.
- Existing `haraka-db` and `haraka-redis` containers are running. Container probes returned PostgreSQL ready and Redis `PONG`.

## Verification run

| Check                           | Result       | Evidence                                                                                                                                                  |
| ------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm.cmd test`                 | Pass         | 7 files, 95 tests passed.                                                                                                                                 |
| `pnpm.cmd build`                | Fail         | Shared packages, worker, and backend build; frontend `tsc` fails.                                                                                         |
| `pnpm.cmd type-check`           | Fail         | Same frontend diagnostics as the build; backend and other packages type-check.                                                                            |
| Frontend dev startup            | Partial pass | Vite started; `/` and `/pricing` returned HTTP 200. The temporary server was stopped.                                                                     |
| API dev startup                 | Fail         | Nest compilation found 0 errors, then Prisma bootstrap failed with `P1000`: PostgreSQL rejected the configured credentials. Port 3000 did not listen.     |
| `docker compose config --quiet` | Fail         | Required `POSTGRES_PASSWORD` is unset.                                                                                                                    |
| PostgreSQL / Redis probes       | Pass         | `pg_isready` succeeded inside `haraka-db`; `redis-cli ping` returned `PONG`. These do not validate the app credentials.                                   |
| Prisma migration status         | Not verified | The attempted package-level Prisma invocation did not resolve the Prisma binary/environment correctly (`DATABASE_URL` missing). No migration was applied. |
| Lint                            | Not run      | The backend lint script includes `eslint --fix`; avoiding it preserves the requested read-only assessment.                                                |
| Integration / E2E               | Not run      | The current test inventory contains unit tests only; no integration or Playwright test files were found.                                                  |

Frontend diagnostics to fix:

- `frontend/src/routes/admin/AdminLoginPage.tsx`: `requestOtp` and `verifyOtp` no longer exist on `HarakaApiClient`.
- `frontend/src/routes/public/LoginPage.tsx`: stale `VERIFY_PHONE` comparisons, missing phone verification state/handlers, and missing `handleEmailVerificationRequest`.

## Current capabilities observed

- Backend source includes modules for auth, merchants, riders, jobs/state machine, dispatch, tracking, pricing, payments, ledger, payouts, disputes, reports, admin, audit, health, and privacy.
- Auth backend/client includes phone/password login, phone/email password recovery, email verification, and a staff TOTP challenge flow. The inspected staff MFA path recognizes `ADMIN`, `SUPER_ADMIN`, and `DISPATCHER`.
- Database schema and five migrations exist; their applied state could not be verified.
- Frontend route set currently has public landing, pricing, how-it-works, coverage, login, and recipient tracking; merchant dashboard/delivery/jobs/detail/addresses/payments/settings; rider offers/active job/earnings/settings; and an admin/dispatcher console with dashboard/fleet/jobs/riders/pricing/ledger/disputes/audit.
- Frontend routes do not currently expose separate verification, finance, support, or analyst workspaces. Several requested public/merchant/rider pages (including terms/privacy/contact/help, scheduled delivery, notification center, rider documents/vehicle/history/support/SOS, and account registration as a standalone route) are not present in the route inventory. Some may be represented within existing screens, but that was not verified.
- The fallback route redirects to `/`; there is no dedicated 404 page.
- Existing documentation identifies incomplete notification outbox production/consumption, payout disbursement, payment callback/reconciliation verification, and zone boundary validation. These remain known gaps; this phase did not implement or retest those flows.

## Conflicts and decisions to carry forward

- The task brief requires phone/password login for merchants, riders, and staff; OTP is limited to password recovery, while staff retain TOTP MFA.
- `docs/PRODUCT_SPEC.md` and ADR-014 currently specify phone OTP followed by TOTP for staff. The task brief is explicit, so the intended implementation direction is password plus TOTP for staff; update the product and decision records before changing auth code.
- The actual project root is `C:\Users\agnes\Desktop\My Works\Pwani Ride`, not the pasted prompt's other machine path. This assessment used the active workspace only.
- Do not retrieve, print, or commit credentials to solve the database mismatch. Do not reset containers or apply migrations while credentials/target database remain unclear.

## Prioritized plan

1. Preserve and reconcile the current dirty worktree/layout transition (`apps/api`, `apps/web` to `backend`, `frontend`) before making broad edits.
2. Align `PRODUCT_SPEC.md` and `DECISIONS.md` to the requested all-user phone/password policy with staff TOTP; verify password reset remains the only OTP flow.
3. Resolve the local database/Compose configuration safely. Confirm the intended target database and credentials without exposing them; validate connectivity and migration status before running any migration or seed.
4. Repair frontend auth/login TypeScript errors, then rerun focused type-check and build. Ensure obsolete phone-verification login UI is removed while account recovery remains.
5. Add server-enforced distinct staff roles/workspaces and role-specific tests; do not rely on frontend-only route guards.
6. Complete the missing requested interfaces and wire controls to existing or newly implemented APIs with loading, empty, and error states.
7. Close reliability gaps: transactional notification outbox, payment authenticity/reconciliation, COD settlement, payout review/disbursement, and service-zone boundary checks.
8. Add integration authorization coverage and a full Playwright delivery flow; verify migration/seed and sandbox provider paths on a known local database.
9. Run lint, full type-check, tests, builds, and Docker Compose smoke checks. Only report full operational success after API/database/web readiness and an end-to-end delivery flow are demonstrated.

## Assessment limits

This phase was inventory and validation only. It did not modify application code, install dependencies, apply migrations, seed data, change secrets, or make provider calls. The web dev server and attempted API watch process were stopped after smoke checks.

## Follow-up after the Phase 1 baseline

- Updated the Product Spec and added ADR-015 to make the requested phone/password policy authoritative for all account types. Staff TOTP remains mandatory; OTP is reserved for password recovery.
- Replaced the stale public phone-verification login screen with phone/password login, added the missing password-confirmation field, and retained phone/email password recovery.
- Changed the staff login UI to authenticate by phone/password before TOTP enrollment or verification.
- After these changes, `pnpm.cmd type-check`, `pnpm.cmd build`, and `pnpm.cmd test` all pass; the unit suite remains 95/95. This does not resolve the API's PostgreSQL credential failure or the Compose `POSTGRES_PASSWORD` requirement.

## Security follow-up — 2026-10-21

The requested read-only security review confirmed two HIGH-severity issues, both addressed in the active `backend/` implementation:

- Merchant job detail and cancellation are scoped to the authenticated merchant. Rider job routes now require the `RIDER` role, and state transitions and pickup-PIN verification check that the rider profile is assigned to that job. Rider status updates use a conditional transactional write to reject stale/racing transitions.
- M-Pesa callback values are no longer trusted as payment evidence. The API queries Daraja for the checkout request's authoritative status before updating payment or ledger records, requires the result code to match the callback, and leaves state unchanged if provider verification is unavailable. The locally generated sandbox-success callback and fake receipt were removed.

Regression evidence after the changes: the backend suite passed 61 tests across 9 files; the root suite passed 103 tests across 8 files; workspace type-check, backend type-check, and backend build passed. Focused ownership/callback coverage is in `backend/tests/jobs-ownership.spec.ts` and `backend/tests/payments.callback.spec.ts`. No live Daraja sandbox transaction has been run, so real provider callback behavior remains unverified.

Three MEDIUM-severity security findings from the review remain outside the selected "fix highest severity issues" scope: PIN attempt throttling/lockout, expiry enforcement on public tracking tokens, and serialization/uniqueness for concurrent active payment attempts. They require a follow-up fix before production release. Docker Compose validation also remains blocked by unset `POSTGRES_PASSWORD`; no containers were started by this follow-up.

Current runtime/build verification: the frontend returned HTTP 200, but the API readiness endpoint on port 3000 was unavailable. The full workspace build failed when Windows returned `EPERM` replacing the generated Prisma client. With user approval the identified, nonresponsive Nest watcher was stopped, but the database package build still failed with the same error. Two other local staff-bootstrap command trees remain active; they were left untouched because they may be performing account setup. The copied generated Prisma client is incomplete, causing two backend test files to fail import and the backend build to report Prisma type/member errors. This is a build-artifact/runtime issue, not a passing application test. The targeted backend build and suites passed before this workspace build attempt; generated output recovery and API readiness are unresolved. Do not interpret the prior Phase 1 API/database failure as resolved by the security code changes.
