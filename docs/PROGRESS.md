# Haraka Progress

Updated: 2026-10-21

## Done

- Aligned authentication with phone/password for all account types, staff TOTP, and OTP for password recovery only; see ADR-015.
- Added required merchant/rider role selection to public login and registration. The API rejects a selected role that is not assigned and creates the corresponding merchant profile or pending rider profile.
- Registration now signs in the new customer and redirects to the selected workspace. Staff registration remains restricted to the dedicated operations login.
- Added the rider workspace's left navigation sidebar; merchant and operations layouts already had left sidebars. Rider online state and profile/verification details now use API data rather than hardcoded approval or vehicle claims.
- Created the requested merchant account locally and verified its password login and merchant role. The database now contains the corresponding merchant profile.
- Started the local PostgreSQL/Redis dependencies and applied the five existing Prisma migrations to the confirmed `haraka` database using `migrate deploy`. Did not reset the database or run seeds. Prisma reports the schema up to date.
- API readiness reports database and Redis healthy; public and authenticated merchant routes were exercised in the browser.
- Added a one-time local `ADMIN` bootstrap CLI with development/loopback/explicit-opt-in gates, hidden password entry, transactional no-existing-staff enforcement, and audit logging. It is not exposed over HTTP and does not bypass mandatory TOTP. The CLI has not been run and no staff account has been created.
- Added Support, Finance, and Verification Officer roles, role selection at staff login, role-specific landing paths and navigation, and backend permission boundaries for each staff route/action. Support can view deliveries/disputes and escalate; Finance can view the read-only ledger and financial summary; Verification can review, approve, or reject eligible riders with a reason recorded; only Admin/Super Admin can suspend/reactivate riders.
- Made rider approval/rejection conditional on the application still being pending or under review; status transition and verification event commit together. Added focused service and route-permission tests for approvals, reasoned rejections, invalid status, and concurrent status changes.
- Applied the additive staff-role migration to the local `haraka` DB; no staff accounts were created.
- Read the relevant Product Spec, architecture decisions, database guide, deployment guide, and runbook before changes.

## Verification evidence

- `pnpm.cmd type-check`: passed for all workspace packages.
- `pnpm.cmd build`: passed for all workspace projects after stopping the API temporarily to release a Windows file lock on the generated Prisma client.
- `pnpm.cmd test`: passed, 95 tests across 7 files.
- Latest `pnpm.cmd --filter @haraka/api test`: 19 passed across 4 files, including account role/profile creation, role mismatch rejection, staff MFA, and the two local-bootstrap safeguard tests.
- Bootstrap verification: backend type-check and build passed; non-interactive invocation was refused before database access; changed-file Prettier check passed.
- Latest validation after the rider rejection and navigation changes: full workspace build passed; backend tests 47/47 across 6 files; root tests 103/103 across 8 files; workspace type-check passed; focused changed-file Prettier check passed. The API watcher initially held a generated Prisma client file lock; stopping that identified watcher allowed the complete build to pass.
- Changed-file Prettier check passed.
- Browser route smoke check: landing, pricing, how-it-works, coverage, merchant dashboard, both new-delivery paths, jobs, addresses, payments, and settings rendered without browser page errors. Mobile merchant sidebar opened and navigated to Payments.
- Browser login with the created merchant reached `/merchant`.
- API liveness/readiness: HTTP 200; database and Redis reported healthy.

## Blockers and limits

- No active service zones exist in the local database. The new-delivery page correctly reports this and cannot generate a quote or book a job until operations configures reviewed zone and vehicle pricing rules. No pricing values or boundaries were guessed.
- Rider and staff content pages were not end-to-end smoke-tested: the local database has no rider or staff accounts. Their frontend code compiles; the rider account flow creates pending profiles, while online status remains blocked until approval and vehicle assignment.
- Repository-wide lint remains unavailable because ESLint 9 has no repository `eslint.config.*`.
- The existing worktree is broadly dirty and contains deleted tracked `apps/api/` and `apps/web/` trees alongside active `backend/` and `frontend/` trees. No unrelated changes were reverted.

## Current services and next action

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- API readiness: `http://localhost:3000/api/v1/health/ready`
- Next: restart/check the local API after build; run the local staff bootstrap from the runbook with unique passwords entered privately; each staff member then signs in at `/admin/login`, selects their role, enrolls TOTP, and tests their permitted pages. Separately, operations must configure approved active service zones and zone/vehicle fare and rider-share rules before quote/booking end-to-end testing. Production deployment remains unapproved.

Last known repository ref: `038a1bee7a72efb94204fbea8db0cce01611e29e`.
