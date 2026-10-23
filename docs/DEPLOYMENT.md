# Haraka Deployment Guide

## Deployment status

Production deployment is not approved yet. See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for unresolved payment, payout, notification, MFA, and verification blockers. The local Docker engine and PostgreSQL/Redis containers are available; Compose image builds and deployment behavior have not been verified.

## Compose layout

The repository currently has a single `docker-compose.yml` defining PostgreSQL/PostGIS, Redis, the API, the web SPA, the notification worker, and Caddy. It does not have a `docker-compose.prod.yml`.

Before a production deployment:

1. Use a Docker-capable host and a reviewed release ref.
2. Create a protected `.env` from `.env.example`. Set unique production values for database credentials, JWT/cookie secrets, the 64-character hexadecimal field-encryption key, CORS origins, domain, and live provider credentials. Configure `RESEND_API_KEY`, `EMAIL_FROM` on a verified sending domain, and HTTPS `WEB_APP_URL` for email verification and password recovery.
3. Require `MPESA_ENV=production` and `AT_ENV=production` for live payments and SMS. Sandbox mode is not live service.
4. Validate configuration and build images:

   ```sh
   docker compose config
   docker compose build
   ```

5. Start the services and apply database migrations:

   ```sh
   docker compose up -d
   docker compose exec api ./node_modules/.bin/prisma migrate deploy --schema packages/database/prisma/schema.prisma
   ```

6. Verify readiness through the configured domain:

   ```sh
   curl -f "https://${DOMAIN}/api/v1/health/ready"
   ```

Do not seed production with development fixture accounts. The current notification worker has no producer, and payout disbursement is not implemented; deploying these services does not make those flows operational.

## Rollback

1. Switch to the previously approved immutable image/release ref.
2. Re-deploy the previous application images without automatically rolling back database migrations.
3. Apply only reviewed, forward-compatible corrective migrations. Do not run destructive rollback commands against production data.
