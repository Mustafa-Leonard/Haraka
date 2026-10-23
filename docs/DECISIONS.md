# Architectural Decisions — Haraka

Format: ADR (Architecture Decision Record)

---

## ADR-001: Modular Monolith over Microservices

**Date**: 2026-10-17
**Status**: Accepted

**Context**: Early-stage platform, small team, need to iterate quickly.  
**Decision**: Single NestJS API with explicit module boundaries and service interfaces.  
**Rationale**: Simpler deployment, shared transactions, easier debugging, modules can be extracted later.  
**Consequences**: All modules share one database; a crashed process affects all modules. Acceptable at this scale.

---

## ADR-002: pnpm Workspaces Monorepo

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Multiple apps (api, worker, web) and shared packages need coordinated dependency management.  
**Decision**: pnpm workspaces with packages at `packages/*` and apps at `apps/*`.  
**Rationale**: Single lockfile, workspace protocol for internal packages, fast installs.  
**Consequences**: Requires pnpm to be installed globally.

---

## ADR-003: Phone OTP as Primary Authentication (Superseded)

**Date**: 2026-10-17  
**Status**: Superseded by ADR-014

**Context**: User sign-in was changed to phone/password with optional email. SMS OTP remains for phone verification and password recovery, rather than routine merchant sign-in.
**Decision**: See ADR-014 for current customer authentication. TOTP MFA remains mandatory for admin.
**Consequences**: Account recovery requires reliable SMS and configured email delivery.

---

## ADR-004: Integer Minor Units for Money

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Floating-point arithmetic causes rounding errors in financial calculations.  
**Decision**: All monetary amounts stored as integer minor units (1 KES = 100 minor units). Display layer formats for users.  
**Rationale**: Exact arithmetic, no rounding surprises.  
**Consequences**: All money fields in DB are integers. Conversion happens at the API boundary.

---

## ADR-005: Double-Entry Ledger

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Financial integrity requires auditability and balance verification.  
**Decision**: Implement double-entry bookkeeping with ledger_accounts, ledger_transactions, and ledger_entries.  
**Rationale**: Every money movement has two sides (debit + credit). Balances can be verified. Corrections use reversing entries, not updates.  
**Consequences**: More complex payment code. Justified by financial correctness requirements.

---

## ADR-006: Outbox Pattern for Notifications

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Notifications must be durable. If an SMS send fails after a delivery is confirmed, the notification must retry.  
**Decision**: Write outbox_events in the same DB transaction as the business event. Worker processes and retries.  
**Rationale**: Guaranteed at-least-once delivery. Idempotent consumers handle duplicates.  
**Consequences**: Slight latency for notifications. Worker must be running. Dead-letter handling required.

**Implementation status**: This remains the accepted target design. Current business services send SMS synchronously and do not create transactional outbox events; the worker queue has no producer. Do not treat the pattern as implemented until producers and handlers are delivered and tested.

---

## ADR-007: PostGIS for Spatial Operations

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Rider location, dispatch candidate selection, and service zone checking require spatial queries.  
**Decision**: PostgreSQL 16 + PostGIS extension. Use geography(Point,4326) for coordinates. GiST indexes on spatial columns.  
**Rationale**: Native spatial operators, accurate distance calculations on sphere, well-supported with Prisma raw queries.  
**Consequences**: Requires PostGIS extension. Some queries use raw SQL for PostGIS functions.

---

## ADR-008: Socket.IO with Redis Adapter

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Live tracking and job updates require real-time bidirectional communication.  
**Decision**: Socket.IO with @socket.io/redis-adapter for horizontal scaling.  
**Rationale**: Mature, handles reconnection and fallback, Redis adapter enables multiple API instances to share rooms.  
**Consequences**: Redis is a hard dependency for real-time features. Polling fallback for clients that fail WebSocket.

---

## ADR-009: Docker Not Available in Current Environment

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Docker is not installed on the development machine.  
**Decision**: Provide complete Dockerfiles and docker-compose.yml for deployment use. Local dev uses locally installed PostgreSQL/Redis or documented alternatives.  
**Rationale**: Docker config is essential for production but cannot be verified locally.  
**Consequences**: Docker configurations are written but not executed locally. Must be tested in a Docker-capable environment before deployment.

---

## ADR-010: Haversine Fallback for Routing

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: OSRM/OpenRouteService may be unavailable or unconfigured.  
**Decision**: Routing adapter pattern. Primary: configured HTTP routing provider. Fallback: Haversine distance × road factor (1.3).  
**Rationale**: Pricing cannot fail completely if routing is unavailable. Estimates must be labeled as estimates.  
**Consequences**: Fallback pricing is an approximation. Quotes generated with fallback are labeled `distanceSource: 'haversine_estimate'`.

---

## ADR-011: Soft Delete Strategy

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Some entities need audit trails; others can be hard deleted.  
**Decision**: Soft delete (deleted_at timestamp) for: users, merchants, riders, addresses, saved_contacts. Hard constraints prevent deletion of: ledger_entries, audit_logs, job_events, payment_provider_events.  
**Rationale**: Balance between auditability and data minimization.  
**Consequences**: All queries on soft-deleted entities must filter `deleted_at IS NULL` unless explicitly querying deleted records.

---

## ADR-012: No Green in Design System

**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Brand specification explicitly prohibits green.  
**Decision**: Status indicators use orange, amber, slate, blue, and red combinations with labels and icons. Never rely on green/red color coding alone.  
**Rationale**: Brand consistency + accessibility (colorblind users).  
**Consequences**: All status pills, badges, and indicators must work without green.

---

## ADR-013: Merchant-Selected Zones and Fare-Percentage Rider Earnings

**Date**: 2026-10-17
**Status**: Accepted

**Context**: Quotes previously selected a global vehicle rule without binding the quote to a service zone or preserving a rider-compensation policy. This also left payment capture and COD settlement without a defined revenue split.

**Decision**:

- A merchant selects an active service zone when requesting a quote. The backend requires that zone and selects an active pricing rule for the exact zone and vehicle; it does not silently fall back to a global rule.
- Each zone/vehicle pricing rule stores rider compensation as integer basis points (0–10,000). The quote and booking snapshot both the zone and share so subsequent rule changes do not change existing bookings.
- The percentage applies to the complete locked delivery fare, including configured zone surcharge. Rider share is rounded half-up to KES minor units.
- Fare quotes are rounded half-up to whole KES (and never below the configured minimum rounded up to whole KES) because M-Pesa STK accepts whole KES amounts. This keeps the captured amount equal to the locked fare.
- For M-Pesa, payment capture credits platform revenue and a rider-payable liability in one balanced transaction. On delivery confirmation, the payable is allocated to the assigned rider's wallet account.
- For COD, a valid delivery PIN confirms the rider collected the full locked fare. COD payment/collection state and the platform/rider share postings are created atomically. The full amount is recorded as rider-held cash in transit; the rider share is credited to their wallet, not mistaken for M-Pesa clearing.
- Existing global pricing rules do not establish zone rates or a compensation percentage. An administrator must configure an explicit zone/vehicle rule before the zone can quote.

**Consequences**: Zones without a matching configured rule return an explicit service-unavailable error. Merchants can select a zone but zone-boundary geospatial validation is not part of this decision or implementation. COD confirmation relies on the delivery PIN and does not independently verify the cash amount.

---

## ADR-014: Password Authentication for Customer Accounts

**Date**: 2026-10-17
**Status**: Accepted

**Context**: Customers requested password sign-in instead of OTP for every login. Accounts need to remain recoverable without locking out existing OTP-created users.

**Decision**:

- Merchants register with a Kenyan phone number and an Argon2id password. Email is optional; it must be verified before it can be used to sign in or recover an account.
- Phone verification is required before customer password sign-in. SMS OTP is limited to phone verification, password recovery, and staff sign-in; it does not create customer accounts.
- Password recovery is available through phone OTP and a hashed, expiring, single-use email token delivered through Resend.
- Password reset revokes active refresh sessions. Password sign-in uses a generic failure response and temporary account lockout.
- Administrative access requires staff phone OTP followed by TOTP. The API issues a short-lived, single-use MFA challenge after phone OTP and creates no session until TOTP succeeds. First-time staff enrollment is completed within that challenge.

**Consequences**: Production configuration must include Resend credentials and a HTTPS web application URL. Existing accounts without a password must use recovery to set one. Staff TOTP secrets remain encrypted with the field-encryption key. The staff-MFA migration revokes existing privileged sessions; JWT authentication checks the server-side session on every protected request.

---

## ADR-015: Phone/Password Login for All Accounts

**Date**: 2026-10-21
**Status**: Accepted

**Context**: The implementation request requires merchants, riders, and staff to sign in with phone and password. The prior Product Spec and ADR-014 described staff phone OTP as the first factor, conflicting with that requirement.

**Decision**:

- All account types use a Kenyan phone number and password for routine sign-in; email is not a login identifier.
- SMS OTP is reserved for password recovery and is not used for routine login or phone verification.
- Privileged staff still complete mandatory TOTP MFA after password authentication. No staff session is issued until TOTP succeeds.
- Password reset revokes active sessions. The existing expiring email reset-link flow may remain as a recovery option.

**Consequences**: Staff login UI/API and Product Spec must remain aligned with phone/password plus TOTP. Tests must verify OTP cannot create a routine session and staff cannot receive a session before TOTP succeeds.

## ADR-016: Explicit Customer Portal Role Selection

**Date**: 2026-10-21
**Status**: Accepted

**Context**: Users with multiple portal roles need to select the workspace they intend to use. The existing public login always routed by role precedence and the public registration form did not send the required full name.

**Decision**:

- The public auth page requires a merchant or rider role selection for registration and login.
- The API rejects sign-in when the selected role is not assigned, using the same generic invalid-credentials response as other sign-in failures.
- Registration creates the selected user role together with its merchant or rider profile. New rider profiles begin in `PENDING` verification and cannot go online until approved and assigned an active vehicle.
- Staff roles are not self-service registration choices. Staff continue to use the protected operations sign-in flow with mandatory TOTP.
- Successful registration signs in the new customer account and routes it to the selected workspace.

**Consequences**: Frontend choices, request validation, API role checks, and role-profile creation must remain in sync. Customer role selection is a workspace choice, not an authorization grant.

## ADR-017: Guarded Local Staff Bootstrap

**Date**: 2026-10-21
**Status**: Accepted

**Context**: The local development database has no staff account, and staff access requires mandatory TOTP. Reusing or promoting a customer account or adding an HTTP bootstrap endpoint would weaken the account boundary.

**Decision**:

- Provide a one-time CLI-only bootstrap that creates an `ADMIN` account only when `NODE_ENV=development`, an explicit per-command opt-in and confirmation flag are present, and `DATABASE_URL` targets loopback PostgreSQL.
- Require an interactive terminal, masked unique password entry per account, explicit final confirmation, and Argon2id hashing. Never accept credentials as command-line arguments or reuse a supplied shared password.
- Recheck the absence of every staff role inside a transaction protected by a PostgreSQL advisory lock. Refuse to reuse any existing user phone number.
- The initial transaction may create one `ADMIN` plus least-privilege `SUPPORT`, `DISPATCHER`, `FINANCE`, and `VERIFICATION_OFFICER` accounts. Record each role assignment in `audit_logs`. First login continues through the normal staff password and mandatory TOTP enrollment flow.
- Do not expose bootstrap over HTTP or grant `SUPER_ADMIN`; `ADMIN` is sufficient for the existing admin interface.

**Consequences**: Local staff setup requires a deliberate operator action and a migrated local database. The opt-in must be removed immediately after use. The CLI must keep its environment, loopback, one-time, and audit safeguards covered by tests.

## ADR-018: Least-Privilege Staff Workspaces

**Date**: 2026-10-21
**Status**: Accepted

**Context**: Staff require different operational areas, but the existing staff login did not ask for a role and the admin controller granted broad access to administrators and dispatchers alike. Support, finance, and rider verification permissions were not defined.

**Decision**:

- Add staff roles `SUPPORT`, `FINANCE`, and `VERIFICATION_OFFICER`; retain `ADMIN`, `SUPER_ADMIN`, and `DISPATCHER`.
- `ADMIN` and `SUPER_ADMIN` retain full access. Dispatchers get fleet/jobs/dispute operations. Support can view jobs and disputes and escalate disputes, but cannot assign/cancel jobs or resolve disputes. Finance can view the ledger and financial summary only. Verification officers can list riders and approve or reject pending/under-review applications; rejection requires a recorded reason. They cannot suspend or reactivate riders.
- Show each staff member only the navigation for their assigned role, route to a role-appropriate landing page after MFA, and enforce every permission again in backend route guards.
- Require the selected login role to be assigned to the authenticated account before issuing the MFA challenge.
- Do not use one shared staff password. Each initial local account gets a unique password entered interactively and enrolls its own TOTP authenticator.

**Consequences**: The new enum values require a database migration. Frontend route restrictions are UX only; backend role guards remain authoritative. Support, finance, and verification use existing pages filtered by permission; a distinct Finance reports UI remains future work.

### ADR-018: Loopback-only development staff MFA bypass

**Date**: 2026-10-21
**Status**: Accepted

**Context**: Local staff interface testing required installing an authenticator and enrolling TOTP for every test account, adding setup work unrelated to verifying role-specific UI.

**Decision**:

- Permit a local staff password-login shortcut only when `NODE_ENV=development`, `HARAKA_DEV_STAFF_MFA_BYPASS=1`, and the API TCP peer address is loopback.
- Keep password validation, selected-role matching, account status checks, sessions, and backend authorization unchanged; audit successful bypass sessions explicitly.
- Reject an enabled bypass flag in any non-development environment. Do not expose a browser-side switch or weaken the normal TOTP endpoints.

**Consequences**: This opt-in is for local interface testing only. Remove it after testing. Staff MFA remains mandatory in staging and production.

## ADR-019: Verify M-Pesa callbacks against Daraja

**Date**: 2026-10-21
**Status**: Accepted

**Context**: The public STK callback endpoint previously changed payment and ledger state using callback-supplied values alone. Those values are not proof that Safaricom processed the payment.

**Decision**:

- Treat the callback as a notification only. Query the Daraja STK status endpoint for its checkout request ID before applying a payment status transition.
- Require the provider-verified result code to match the callback result. If status cannot be verified, do not mutate payment or ledger state; return an error so the provider can retry.
- Do not synthesize a successful callback or receipt in sandbox mode. Sandbox STK initiation alone leaves a payment pending until a verifiable provider response exists.

**Consequences**: Live callback processing depends on valid Daraja credentials and availability of the status-query API. Sandbox simulations cannot demonstrate successful payment capture or ledger posting; those require a real provider sandbox transaction and verification.
