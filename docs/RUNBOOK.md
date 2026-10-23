# Haraka Operations Runbook

## Readiness checks

The API is mounted under `/api/v1`.

- Liveness: `GET /api/v1/health/live`
- Readiness: `GET /api/v1/health/ready` (database and Redis connectivity)

The Compose API health check uses the readiness endpoint. Use the configured public domain when checking from outside the Compose network.

## Local development login

The development seed creates verified merchant and rider fixtures. Set `HARAKA_DEMO_PASSWORD` to a private password of at least 16 characters in the environment used to run `pnpm db:seed`; the seed hashes it for both accounts and refuses to run when `NODE_ENV=production`.

- Merchant: `+254711000001`
- Rider: `+254722000002`
- Password: the local `HARAKA_DEMO_PASSWORD` value

These fixtures are for local development only. Staff accounts use their role-specific phone/password login and mandatory TOTP except when the explicit loopback-only development bypass below is enabled; SMS OTP is reserved for password recovery. Never share staff passwords.

### Local staff UI testing without an authenticator

For local UI testing only, the backend supports a development MFA bypass. It requires both `NODE_ENV=development` and `HARAKA_DEV_STAFF_MFA_BYPASS=1`, and only bypasses TOTP when the API TCP connection itself comes from a loopback address. Password checks, role checks, route authorization, and session creation remain enabled. The bypass is audited as `STAFF_MFA_DEV_BYPASS`.

Set the opt-in in the backend's ignored local `.env` file, restart the API, and sign in at `/admin/login` using the staff phone, password, and assigned role. Remove the opt-in and restart the API when testing is complete. Configuration validation rejects enabling the flag outside development; never enable this setting in production or on a network-accessible development server.

### One-time local staff bootstrap

Use this only for a local development database when no staff account exists. The CLI refuses production mode, non-loopback PostgreSQL URLs, an existing staff role, and non-interactive password entry. It can create up to 10 initial staff accounts in one atomic transaction, requires exactly one initial `ADMIN`, writes a `ROLE_ASSIGN` audit record per account, and does not bypass mandatory TOTP enrollment on first sign-in.

From the repository root in PowerShell, after confirming the local database is migrated:

```powershell
$previousNodeEnv = $env:NODE_ENV
$previousBootstrapOptIn = $env:HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP
$env:NODE_ENV = 'development'
$env:HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP = '1'
try {
  pnpm.cmd --filter @haraka/api bootstrap:local-staff -- --confirm-local-staff-bootstrap
  if ($LASTEXITCODE -ne 0) { throw "Bootstrap failed with exit code $LASTEXITCODE" }
} finally {
  if ($null -eq $previousBootstrapOptIn) {
    Remove-Item Env:HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP -ErrorAction SilentlyContinue
  } else {
    $env:HARAKA_ALLOW_LOCAL_STAFF_BOOTSTRAP = $previousBootstrapOptIn
  }
  if ($null -eq $previousNodeEnv) {
    Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
  } else {
    $env:NODE_ENV = $previousNodeEnv
  }
}
```

The CLI prompts for each staff member's name, role, and Kenyan phone number, then prompts twice for a unique password without echoing it. Each phone number must be unique and must not already belong to an account; this process never promotes or edits an existing account. Choose passwords of at least 12 characters. Enter the Administrator, Support, Dispatcher, Finance, and Verification Officer accounts as needed; the initial batch must include exactly one Administrator. At the final prompt, type `CREATE LOCAL STAFF` exactly to proceed. Then each staff member signs in at `/admin/login` with their selected role and completes TOTP setup in their own authenticator app. Keep the bootstrap opt-in unset after use; do not save credentials in command arguments, source files, or project documentation.

Staff workspace access is least-privilege: support can view deliveries/disputes and escalate disputes; dispatchers can manage delivery assignment and disputes; finance can view ledger/financial summary; verification officers can review, approve, or reject pending rider applications (rejection requires a reason). Administrators can access all existing operations pages. Browser-side navigation is not an authorization boundary; API role guards enforce access.

## Incidents

### Database connection pool pressure

Inspect PostgreSQL activity:

```sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

Review application connection limits and PostgreSQL capacity before changing pool settings. Terminate sessions only after confirming they are safe to stop.

### Redis unavailable

Readiness should fail while Redis is unavailable. Check the Redis container logs and health state, then verify API readiness after recovery. Do not report the API as ready based only on process liveness.

### M-Pesa callback or payment failure

The repository does not currently provide a verified automated reconciliation command or an operational payment-reconciliation UI. Do not manually mark payments successful. Reconcile against Safaricom records and follow the approved finance procedure; record unresolved payment states as incidents.

### SMS delivery failure

Live SMS requires valid Africa's Talking production configuration. API SMS dispatch is synchronous and not backed by a transactional outbox yet. Check provider status without logging phone numbers, message bodies, OTPs, or PINs. A business action may have committed even if its SMS request failed; inspect the persisted business record before retrying.

### Payout request

Rider payout requests are recorded and reserve available ledger balance. Automated M-Pesa B2C disbursement and an operations review workflow are not implemented. Do not tell a rider that a request has been paid.

## Database backup and restore

Use the organization's approved PostgreSQL backup process and protect backups as production data. Before launch, document and test retention, encryption, restore permissions, recovery point objective, and recovery time objective. No RPO/RTO target is certified by this repository.

Conduct restore drills against an isolated database. Never restore over production as part of a drill.
