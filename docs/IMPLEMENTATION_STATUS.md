# Haraka Implementation and Deployment Status

Last updated: 2026-10-21
Last committed base ref before the current dirty worktree: `038a1bee7a72efb94204fbea8db0cce01611e29e`

## Latest local verification — 2026-10-21

- Added required merchant/rider role selectors to public sign-in and registration. The API checks that the selected portal role is assigned before issuing a session; new rider registrations get a pending rider profile, while public registration cannot create staff roles.
- Successful registration signs the new user in and sends them to the selected merchant or rider workspace. Staff remain on the dedicated password + mandatory TOTP sign-in flow.
- Added a responsive left sidebar to the rider workspace, matching the merchant/operations navigation pattern. Merchant and operations sidebars now keep their parent section active on nested pages. Rider account details and verification status are loaded from the API instead of presenting hardcoded approval/vehicle data.
- Started the local PostgreSQL and Redis containers. The confirmed local `haraka` database had the PostGIS extensions but no Haraka application tables; applied the five existing Prisma migrations using `migrate deploy` (no reset and no seed). Prisma now reports the schema up to date.
- Created and verified the requested merchant account in the local database. The account uses the phone number supplied by the user and has a merchant profile; its password is not recorded in project files or this document.
- API liveness/readiness returned HTTP 200; readiness reported database and Redis healthy. The frontend returned HTTP 200.
- Added a guarded, one-time local staff bootstrap CLI. It can create up to 10 initial accounts (one administrator required) on loopback PostgreSQL in explicit development mode, requires a unique hidden password per account and final confirmation, records an audit event per role assignment, and leaves first-login TOTP enforcement intact. Its transaction-scoped advisory lock uses Prisma `$executeRaw` because `$queryRaw` cannot deserialize PostgreSQL's `void` result; the focused bootstrap safeguard tests pass (2/2).
- Created and verified five local testing staff accounts in one transaction on the loopback development database, with unique generated passwords, Argon2id hashes, and role-assignment audit records. Passwords are not stored in project files or documentation. Normal sign-in requires TOTP; the explicit loopback-only local testing bypass is available for UI verification.
- Fixed the unexpected staff login enrollment failure: the API-local `.env` contained a 48-character encryption key, but AES-256-GCM requires exactly 32 bytes (64 hex characters). Updated local API configuration to use the valid workspace key and added validation coverage for malformed development keys. No TOTP enrollment had been persisted before this fix.
- Added an explicitly opted-in development-only staff MFA bypass for local UI testing. It requires a loopback TCP peer, still validates password and assigned role, issues a normal session, and writes a distinct audit event; startup validation rejects the bypass outside development. Production/staging TOTP behavior is unchanged.
- Enabled the bypass only in ignored `backend/.env` for this local test environment. Verified password sign-in and selected-role matching for all five staff roles, and verified the Administrator is redirected to the operations dashboard in the browser without TOTP enrollment.
- Replaced the unknown-route redirect-to-home with a clear not-found page and verified a direct `/admin/nonexistent-audit-route` navigation renders the 404 state.
- Full-scope audit confirmed the implemented route groups are public, merchant, rider, and the shared role-filtered `/admin` workspace. Separate `/finance`, `/support`, `/verification`, and `/dispatcher` applications are not present. The schema has a `Refund` record but no refund workflow API, and has no support-ticket model; staff/permission schema records do not yet have management APIs or UI. Do not fabricate these workflows until their approval, status, and record-scope policies are agreed.
- Added distinct Support, Finance, and Verification Officer staff roles with per-route backend authorization, role-selected staff login, role-filtered navigation, and role-specific landing pages. Support is read-only except dispute escalation; Finance receives read-only ledger and financial-summary access; Verification can approve or reject eligible rider applications with a recorded reason, but cannot suspend/reactivate; administrators have the full existing interface.
- Applied the additive staff-role Prisma migration to the local `haraka` database with `migrate deploy` after validating the schema. No existing staff assignments required migration.
- Rider approval and rejection now use conditional status updates and record verification events transactionally, preventing concurrent decisions from overwriting each other. Rejection requires a non-empty reason and records it in the verification event and audit log.
- Latest verification: backend tests passed (53 across 7 files); root tests passed (103 across 8 files); backend/frontend type-checks, API/frontend builds, and the frontend Prettier check passed. The first earlier workspace build attempt hit a Windows lock held by the API watch process; after stopping that identified process, the full build completed successfully.
- All five local staff accounts signed in successfully through the API with their assigned roles and the development-only loopback MFA bypass. Browser checks opened each role's allowed routes and confirmed the expected page headings without browser errors. Additional Finance UI checks confirmed the period filters respond, the mobile sidebar opens/closes and navigates, and navigating to an unauthorized staff page returns to Finance's allowed ledger page. The Finance-to-rider-list API check returned 403. Other live cross-role API checks and per-action workflows remain incomplete; repeated sign-ins previously hit the API's 429 login throttle.
- Security follow-up fixed the two HIGH findings from the read-only review: merchant job detail/cancellation now query within the authenticated merchant's scope; rider routes require the RIDER role and assigned-rider ownership before transitions/PIN verification; state changes use a conditional update in a transaction. M-Pesa callbacks now trigger an independent Daraja STK status query and must match its result before payment/ledger mutation. Removed the local fake successful sandbox callback and generated receipt; sandbox-initiated payments remain pending without provider verification.
- Verification after these security changes: focused authorization/callback tests passed (30 tests across 3 files); full backend suite passed (61 tests across 9 files); root unit suite passed (103 tests across 8 files); workspace type-check, backend type-check, and backend build passed. `git diff --check` passed for the touched implementation and docs. Live Daraja callback verification remains untested because provider sandbox credentials/transactions are not configured and confirmed.
- An initial full-workspace build attempt failed replacing `packages/database/dist/generated/client` with Windows `EPERM`; a parallel test/build run then reported missing generated Prisma types. This was recovered as recorded below. Docker Compose configuration validation remains blocked: `docker compose config --quiet` reports the required `POSTGRES_PASSWORD` environment variable is unset. No Compose services were started or changed.
- Server recovery on 2026-10-21: stopped stale, explicitly identified local staff-bootstrap processes after confirming they had been running since early afternoon, rebuilt the database package/generated Prisma client, then passed backend type-check/build (after Prisma recovery), backend tests (61/61), and root tests (103/103). Restarted the API with `pnpm.cmd --filter @haraka/api dev`. Verified API liveness and readiness both return HTTP 200; readiness reports database and Redis `ok`. Frontend still returns HTTP 200. Listeners are present on ports 5173 (Vite) and 3000 (Nest). No migrations, seeds, or Docker services were run.

## Deployment readiness

**Not approved for real-life deployment.** This task validates local code and applies the additive local schema migration; it does not complete production readiness. Existing blockers still include unverified live payment/SMS providers and callback reconciliation, missing durable notification outbox producers, no active reviewed service zones/pricing rules in the local database, and no full authenticated staff/customer end-to-end run. ESLint is also unavailable because the repository has no ESLint 9 flat config. Do not treat a local UI smoke test or a successful build as deployment approval.

- Browser smoke checks covered public landing, pricing, how-it-works, coverage, merchant dashboard, new-delivery entry points, jobs, addresses, payments, and settings. No browser page errors were observed. The mobile merchant sidebar opened and navigated successfully. Staff route checks visited each role's permitted pages directly; Finance period filters, mobile sidebar toggle/navigation, and an unauthorized client-side route redirect were also exercised.
- **Remaining local blocker:** `/merchant/new` correctly reports no active service zones; booking cannot be fully exercised until operations configures active zones and zone/vehicle pricing rules. No pricing or zone policy was guessed. Protected rider routes remain unverified because there are no rider accounts in this local database.
- The Administrator dashboard was opened successfully through the local bypass. Direct route rendering was verified for all five staff roles, but click-through navigation and page actions were not exhaustively tested for every role. Live cross-role API checks beyond Finance-to-rider-list remain pending, as do protected rider routes; customer/public browser smoke checks do not constitute a complete end-to-end test of every page/component.

## Next local actions

1. Continue staff workflow testing by clicking each role's permitted sidebar links and exercising safe page actions; complete the remaining live cross-role API checks without repeated sign-ins that would trigger the login throttle. For local UI work only, the loopback MFA bypass is currently enabled; turn it off after testing.
2. Add or identify a local rider test account before checking protected rider routes.
3. Separately, obtain approved service-zone boundaries and fare/rider-share rules before testing delivery quote and booking flows.

No failing tests were observed in the latest API/workspace test, type-check, or build runs. Repository-wide ESLint remains unavailable because there is no ESLint 9 flat config.

## Assessment summary

Haraka is not ready for production deployment. The repository contains substantial implementation work, but the production payment, rider settlement, notification reliability, administrative MFA, and container deployment paths are incomplete or have not been verified.

The current worktree contains `backend/` and `frontend/`, while Git reports the tracked `apps/api/` and `apps/web/` trees as deleted and the replacement trees as untracked. The worktree is broadly dirty; approval and commit history for that reorganization have not been verified. Do not interpret this local state as a committed or approved migration. Development fixtures in the database seed remain intentionally labelled as development data.

The user requested use of Nano Banana for icons; that generator is unavailable in this environment. The edited interfaces use the already-installed Lucide icon library instead.

The confirmed local `haraka` database is reachable. Its five existing Prisma migrations have been applied with `migrate deploy`; no reset or seed was run. Active service-zone pricing still needs operator configuration before delivery quotes can be generated.

## Work completed in this assessment

- Removed demo login controls, fabricated login/profile/earnings responses, hardcoded OTP bypass behavior, fake ledger/pricing success fallbacks, and unconfigured live-payment fallback behavior from the reviewed paths.
- Replaced decorative fleet/tracking maps with maps backed by API GPS data and replaced emoji UI glyphs in the reviewed application surfaces with Lucide icons.
- Removed a fabricated contact number and unsupported rider commission claims. The public pricing calculator is now explicitly labelled illustrative; checkout remains the source of the official quote.
- Corrected wallet availability to subtract pending payout reservations, use Nairobi week boundaries, and report ledger movement separately from available balance.
- Replaced the masked delivery-PIN SMS with the generated recipient PIN. Sensitive SMS message bodies are redacted before persistence; adapter logs do not include recipient or message content.
- Made the SMS sandbox explicit and prevented an unconfigured live adapter from returning a simulated success.
- Added server-side M-Pesa idempotency-key checks, merchant ownership validation, pending/successful intent reservation before provider dispatch, callback amount matching, and atomic duplicate-safe callback/ledger posting.
- Removed the worker's fake “delivered” response and event poller that marked unprocessed outbox events complete. The notification queue worker now sends through Africa's Talking when configured and propagates failed jobs for BullMQ retry handling. No producer currently enqueues its jobs.
- Fixed the web container to serve the built SPA from `/srv` and route unknown paths to `index.html`.
- Updated the database package build to avoid a duplicate generated-client copy on Windows.
- Updated Compose and Docker build files for the active workspace layout. Container builds remain unverified.
- Implemented merchant-selected active service zones for quotes; quote rule lookup is specific to the selected zone and vehicle with no global fallback.
- Added per-zone/per-vehicle rider-share basis points to pricing rules and immutable zone/share/earnings snapshots to quotes and bookings. Admins can create zone pricing rules and version rule edits in the pricing UI.
- Split M-Pesa capture between platform revenue and rider payable; on delivery, payable is allocated to the assigned rider wallet. COD delivery confirmation creates the COD payment/record and balanced platform/rider postings atomically, with rider-held cash represented separately from M-Pesa clearing.
- Rounded locked fares half-up to whole KES for M-Pesa compatibility, while ensuring the rounded fare does not fall below the configured minimum. Rider share uses integer minor-unit arithmetic and half-up rounding.
- New delivery quotes no longer use fixed Kilifi example coordinates. Merchants must enter actual pickup/dropoff coordinates; booking rejects route, vehicle, or parcel details that differ from the quote snapshot.
- Added a Prisma baseline migration from the committed schema and corrected the rider-compensation migration's physical column names. Applied all five migrations successfully to the configured local database.
- Corrected the staff MFA migration's enum-array cast so it applies against the PostgreSQL `UserRole[]` column.
- Aligned health probe routing with the `/api/v1` API prefix used by the runbook and Compose readiness check.

## Verification evidence

- Database package build: `pnpm --filter @haraka/database build` passed during this assessment.
- Unit tests: `pnpm test` passed, 95 tests across 7 files, including zone-specific pricing, whole-KES fare rounding, rider-share split accounting, payment ownership, amount validation, idempotency, and duplicate callback cases.
- Backend package tests: `pnpm --filter @haraka/api test` passed, 14 tests across 3 files.
- Production build: `pnpm build` passed for packages, API, worker, and frontend. The main frontend chunk is 356.74 KB (113.72 KB gzip); the Leaflet chunk is loaded separately.
- Workspace type-check: `pnpm type-check` passed after adding the missing worker TypeScript configuration.
- Frontend production-preview smoke test: `/` and `/pricing` returned HTTP 200.
- Prettier check passed for the files changed in this assessment. The repository-wide format check failed on formatting warnings across the wider worktree.
- Lint could not run: ESLint 9 reports that the repository has no `eslint.config.js`/`mjs`/`cjs`.
- Backend type-check and production build pass. The API starts against the configured local PostgreSQL and Redis services, and its readiness probe reports both dependencies healthy. Provider callbacks and Compose image builds remain unverified.
- Prisma reports all four database migrations applied and the schema up to date on the configured local database.
- The development seed now provisions password hashes for the verified merchant and rider fixtures using the local `HARAKA_DEMO_PASSWORD`; staff login remains protected by OTP and TOTP.
- Replaced the custom Zod request parameter decorator with Nest's standard body decorator and schema pipe after login requests reached the handler without their validated identifier.
- The initial repository test run also passed 75 tests before this assessment's changes.
- Zone pricing and rider-compensation changes are not production-ready until operators configure a rider share for every enabled zone/vehicle pair. Existing global development seed rules do not configure this policy.

## Outstanding production blockers

1. **Payments and settlements:** rider earnings are now split and posted for successful M-Pesa and COD deliveries. Callback authenticity, unknown provider outcomes, COD cash settlement, reconciliation, and live integration behavior still need verification.
2. **Payouts:** API requests can be recorded and reserve a ledger balance, but no operations review/disbursement interface or verified M-Pesa B2C settlement flow exists. Do not describe requests as instant cashouts.
3. **Zone configuration:** configure a reviewed rider-share percentage and an explicit fare rule for each active zone/vehicle pair. Zone selection currently does not validate that both route coordinates fall within that zone's boundary.
4. **Notifications:** API SMS dispatch is still synchronous and is not written to a transactional outbox with its business transaction. The worker queue has no producer. Delivery failure after a business write can leave the business action committed while its request reports an error. Complete the outbox producer/consumer flow before relying on SMS delivery.
5. **Recipient delivery PIN:** the generated PIN is now sent at booking time. Verify this timing with product operations and test the complete SMS-to-delivery flow against the live provider.
6. **Administrative MFA:** the staff auth API now requires TOTP after SMS OTP and does not issue a session before TOTP succeeds. Run the first-enrollment and repeat-login flow against the migrated production-like database/provider before launch.
7. **Production operations:** run container builds, migrations, API/web health checks, provider callbacks, backup/restore, and end-to-end delivery tests in a Docker-capable environment using production-like integrations.
8. **Environment and legal readiness:** supply real provider credentials, production secrets, configured CORS/domain values, and confirm data-protection and operational requirements before launch.

## Required next actions, in dependency order

1. Configure and review the rider-share percentage and fare values for each launch zone/vehicle rule; verify route coordinates against zone coverage before serving real bookings.
2. Complete payout review and verified M-Pesa B2C disbursement, including COD cash settlement and reconciliation.
3. Implement transactional notification outbox writes and worker handlers, with redacted logs and retry/dead-letter tests.
4. Verify server-enforced payment idempotency, add callback authenticity controls, and implement provider reconciliation.
5. Exercise first-time admin TOTP enrollment and repeat staff login against a live database and SMS provider; verify authorization and challenge expiry/reuse behavior.
6. Validate the migration chain and recovery procedure against a representative non-local database; the configured local database has all four migrations applied.
7. Run workspace type-check, build, lint, unit/integration/E2E tests, and live API/web smoke checks; fix all failures.
8. Build and run Compose images in a Docker-capable environment; verify migrations, health checks, TLS routing, and backup/restore.
9. Complete provider sandbox and live credential verification, then repeat end-to-end delivery/payment/payout tests.

**Deployment decision:** not approved for production until all blockers above are resolved and verified. This status does not claim the application is deployment-ready.

## Customer password authentication update

The customer registration/sign-in flow now uses phone number and password, with optional email. Phone verification is required before password sign-in; email sign-in additionally requires a verified email. Password recovery is available by phone OTP or email link. Staff sign-in now requires SMS OTP followed by TOTP.

- Added Argon2id password hashes, failed-login lockout, generic invalid-credential responses, single-use expiring email action tokens, and refresh-session revocation after password reset.
- Added Resend email delivery configuration and the password/verification endpoints and web flows. Users with an optional email can request another verification link from the phone-verification screen.
- Staff OTP now creates only a short-lived, single-use MFA challenge; staff sessions are issued only after TOTP validates. First-time staff can enroll TOTP within that challenge. The challenge hash is persisted in the existing authentication-attempt table; TOTP secrets remain encrypted using the configured field-encryption key.
- Authenticator verification records its last successful use and rejects immediate code reuse.
- JWT authentication now checks the associated session's owner, active state, and expiry. Session creation/rotation failures are no longer converted into non-persisted fallback sessions. The `20261017190000_staff_mfa_enforcement` migration revokes existing privileged staff sessions so legacy sessions cannot bypass the new MFA requirement.
- Added the additive migrations `20261017183000_password_auth` and `20261017190000_staff_mfa_enforcement`. Prisma schema validation and client generation pass; neither migration has been applied to a database.
- Verification: focused backend auth/MFA/guard tests pass (14 tests); root unit suite passes (95 tests); `pnpm type-check` and the full `pnpm build` pass; changed-file Prettier check passes.
- Lint remains unavailable because ESLint 9 has no `eslint.config.js`/`mjs`/`cjs` in the repository. This is an existing tooling/configuration gap, not a passing lint result.
- Frontend development server is running on `http://127.0.0.1:5173` and production preview on `http://127.0.0.1:4173`; `/`, `/login?mode=register`, `/pricing`, and `/admin/login` returned HTTP 200. API startup was attempted again but failed because Redis refused its connection; API port 3000 is not listening. Local PostgreSQL (5432) and Redis (6379) are unavailable, so auth API calls, database integration, and migration execution cannot be tested locally. Both configured local dependency URLs point to localhost; `.env` values were otherwise not inspected.
- Production remains **not approved**. In addition to the blockers above, validate and apply migrations against the actual database, verify live provider delivery and the staff TOTP enrollment/login flow, and run authenticated end-to-end registration/recovery tests before deployment.

## Mobile responsiveness update

- Added collapsible mobile navigation to the public, merchant, and operations layouts, with accessible labels and expanded-state attributes. The rider layout retains its fixed bottom navigation and uses safe-area spacing.
- Added shared responsive behavior for compact layouts, content grids, forms, tables, touch controls, maps, and admin/merchant headers. Public landing hero padding and type scale adapt to small screens.
- Browser checks at 320, 375, 768, and 1024 CSS pixels found no horizontal document overflow on public, merchant, rider, and admin layouts. The public, merchant, and admin mobile navigation toggles opened and exposed their navigation at 320px. The 320px case also fixed a 6px overflow caused by a fixed minimum width when a vertical scrollbar was present.
- Private layouts were rendered with temporary browser-only auth state; this verifies layout responsiveness only, not actual authentication or API-backed content. Backend calls still fail because PostgreSQL and Redis are unavailable locally.
- Verification after the responsive changes: root unit suite passed (95 tests); changed-file Prettier check passed. Full build and workspace type-check had passed earlier in this work; final CSS-only refinements do not affect TypeScript.

## Phase 0/1 reassessment — 2026-10-21

The active workspace was reassessed at ref `038a1bee7a72efb94204fbea8db0cce01611e29e`. The worktree was already broadly dirty, including deleted tracked `apps/api/` and `apps/web/` trees and untracked `backend/` and `frontend/` replacements; no source files were changed or restored during this assessment.

- `pnpm.cmd test`: passed, 95 tests across 7 files.
- `pnpm.cmd build` and `pnpm.cmd type-check`: failed on existing frontend auth mismatches in `frontend/src/routes/admin/AdminLoginPage.tsx` (`requestOtp`, `verifyOtp`) and `frontend/src/routes/public/LoginPage.tsx` (stale `VERIFY_PHONE` state/handlers). Backend and other workspace packages compiled/type-checked successfully.
- Frontend dev server started; `/` and `/pricing` returned HTTP 200. The temporary server was stopped.
- API watch compilation found zero TypeScript errors but bootstrap failed with Prisma `P1000` because the configured PostgreSQL credentials were rejected; API readiness was unavailable. PostgreSQL and Redis container health probes succeeded independently.
- `docker compose config --quiet` failed because required `POSTGRES_PASSWORD` was unset. No migration, seed, database write, or container change was performed.
- Node observed: `v24.22.0`; pnpm: `9.15.4` via `pnpm.cmd`; Docker: `29.9.1`. The PowerShell `pnpm.ps1` shim is blocked by execution policy.
- The task's all-user phone/password requirement conflicts with the current Product Spec/ADR-014 staff OTP flow. The requested continuation direction is phone/password plus staff TOTP, with OTP reserved for recovery; synchronize the authoritative docs before implementation.

See [ASSESSMENT.md](./ASSESSMENT.md) for the detailed evidence and prioritized plan and [PROGRESS.md](./PROGRESS.md) for current continuation state. These findings supersede earlier claims that the current workspace build/type-check succeeds and that API startup failed due Redis; the latest observed blocker is PostgreSQL credential rejection.

## Phone/password login UI alignment — 2026-10-21

- Replaced the stale public phone-verification sign-in screen with phone/password sign-in; added the confirmation-password field required by registration validation and retained SMS/email password recovery.
- Changed the staff login screen to use phone/password followed by mandatory TOTP enrollment/verification; no SMS OTP is requested during staff login.
- Updated `PRODUCT_SPEC.md` and recorded ADR-015 to align the requested all-account phone/password policy with staff TOTP.
- Verification after these changes: `pnpm.cmd type-check` passed across all 10 workspace projects; `pnpm.cmd build` passed; `pnpm.cmd test` passed (95 tests across 7 files).
- API startup remains blocked by PostgreSQL `P1000` credentials; Compose validation remains blocked by unset `POSTGRES_PASSWORD`. No migration or seed ran.
