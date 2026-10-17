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

## ADR-003: Phone OTP as Primary Authentication
**Date**: 2026-10-17  
**Status**: Accepted

**Context**: Target users in coastal Kenya primarily use mobile phones. Many may not have desktop email access.  
**Decision**: Phone number + SMS OTP for merchants and riders. TOTP MFA mandatory for admin.  
**Rationale**: Familiar UX, aligns with M-Pesa phone-centric financial ecosystem.  
**Consequences**: Depends on SMS provider availability. Need rate limits and abuse controls. OTP codes never stored in plaintext.

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
