# Haraka \u2014 On-Demand Delivery Platform

**Haraka** (Swahili for "quick") is a production-grade on-demand delivery and logistics platform connecting merchants, riders, recipients, and dispatchers across coastal Kenya \u2014 starting with Kilifi, Malindi, and Mombasa.

## Architecture Overview

```
haraka/
\u251c\u2500\u2500 apps/
\u2502   \u251c\u2500\u2500 api/          # NestJS + Fastify REST API + Socket.IO
\u2502   \u251c\u2500\u2500 worker/       # BullMQ background job processor
\u2502   \u2514\u2500\u2500 web/          # React 18 + Vite PWA (5 interfaces)
\u251c\u2500\u2500 packages/
\u2502   \u251c\u2500\u2500 database/     # Prisma schema, migrations, seeds
\u2502   \u251c\u2500\u2500 shared-types/ # TypeScript types shared across apps
\u2502   \u251c\u2500\u2500 validation/   # Zod schemas shared across apps
\u2502   \u251c\u2500\u2500 api-client/   # Generated OpenAPI client
\u2502   \u251c\u2500\u2500 theme/        # Design tokens and CSS
\u2502   \u251c\u2500\u2500 i18n/         # English and Swahili translations
\u2502   \u2514\u2500\u2500 config/       # Shared configuration utilities
\u251c\u2500\u2500 infrastructure/
\u2502   \u251c\u2500\u2500 docker/       # Dockerfiles
\u2502   \u251c\u2500\u2500 proxy/        # Caddy/Nginx config
\u2502   \u251c\u2500\u2500 prometheus/   # Metrics config
\u2502   \u2514\u2500\u2500 grafana/      # Dashboard definitions
\u251c\u2500\u2500 tests/
\u2502   \u251c\u2500\u2500 integration/  # Database + API integration tests
\u2502   \u251c\u2500\u2500 e2e/          # Playwright end-to-end tests
\u2502   \u251c\u2500\u2500 load/         # k6 load tests
\u2502   \u2514\u2500\u2500 security/     # OWASP ZAP and security tests
\u251c\u2500\u2500 docs/             # All documentation
\u2514\u2500\u2500 .github/workflows/ # CI/CD
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 LTS |
| Backend framework | NestJS + Fastify |
| ORM | Prisma |
| Database | PostgreSQL 16 + PostGIS |
| Cache / Queues | Redis 7 + BullMQ |
| Real-time | Socket.IO |
| Frontend | React 18 + Vite |
| State management | TanStack Query + Zustand |
| Maps | Leaflet + OpenStreetMap |
| Payments | Safaricom Daraja (M-Pesa) |
| SMS | Africa's Talking |
| Auth | Phone OTP + JWT + Refresh Cookies |
| Admin MFA | TOTP |
| Testing | Vitest + Playwright + k6 |

## Quick Start (Local Development)

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16 with PostGIS extension
- Redis 7

### 1. Clone and install

```bash
git clone <repo-url> haraka
cd haraka
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your local PostgreSQL and Redis connection strings
```

### 3. Initialize database

```bash
pnpm db:migrate
pnpm db:seed
```

### 4. Start development servers

```bash
pnpm dev
```

This starts:
- API at http://localhost:3000
- Web at http://localhost:5173
- Worker (background jobs)

### With Docker (recommended)

```bash
docker compose up --build
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions.

## Documentation

| Document | Description |
|----------|-------------|
| [PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Business model, actors, workflows |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and diagrams |
| [DATABASE.md](docs/DATABASE.md) | Entity relationships and schema |
| [API_CONTRACT.md](docs/API_CONTRACT.md) | API endpoints and contracts |
| [SECURITY.md](docs/SECURITY.md) | Security architecture |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Brand, tokens, components |
| [INTEGRATIONS.md](docs/INTEGRATIONS.md) | External service integrations |
| [TESTING.md](docs/TESTING.md) | Test strategy and coverage |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Infrastructure and deployment |
| [RUNBOOK.md](docs/RUNBOOK.md) | Operations and incident response |
| [IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) | Current build status |

## Running Tests

```bash
# Unit + integration tests
pnpm test

# End-to-end tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Key Design Decisions

- **Modular monolith**: Single NestJS API with explicit module boundaries
- **Money as integers**: KES stored as minor units (1 KES = 100 units)
- **Double-entry ledger**: Every financial movement is balanced
- **Outbox pattern**: Durable, at-least-once notification delivery
- **Deny-by-default RBAC**: Authorization enforced server-side always
- **PostGIS**: Spatial queries for dispatch, tracking, and zone checks
- **Phone OTP auth**: Aligned with M-Pesa phone-centric UX

See [docs/DECISIONS.md](docs/DECISIONS.md) for all architectural decision records.

## License

Proprietary \u2014 Haraka Logistics Ltd. All rights reserved.
