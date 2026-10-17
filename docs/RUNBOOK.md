# Haraka — Operations & Incident Response Runbook

## 1. Health Checks & Verification
- **Liveness Probe**: `GET /health/live` returns HTTP 200 `{ "status": "ok" }`.
- **Readiness Probe**: `GET /health/ready` validates PostgreSQL and Redis connectivity.
- **Detailed Health Check**: `GET /health` returns connection pool statistics and queue depths.

---

## 2. Common Incident Procedures

### 2.1 Database Connection Pool Exhaustion
**Symptoms**: High p95 latency, 500 errors with connection timeout messages.
**Diagnosis**:
```sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```
**Remediation**:
- Increase `DATABASE_POOL_MAX` in `.env` if memory permits.
- Terminate idle connections:
```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < current_timestamp - INTERVAL '5 minutes';
```

### 2.2 Redis Queue Backlog (BullMQ)
**Symptoms**: SMS notifications or matching tasks delayed.
**Diagnosis**: Check queue depth in Grafana dashboard or BullMQ admin.
**Remediation**: Scale worker instances horizontally:
```bash
docker compose up -d --scale worker=3
```

### 2.3 M-Pesa Callback Failures / Webhook Timeouts
**Symptoms**: Payments remain in `PENDING` state despite customer receiving M-Pesa SMS confirmation.
**Remediation**:
- Trigger automated reconciliation job:
```bash
pnpm --filter @haraka/worker exec tsx src/jobs/reconcile-mpesa.ts
```
- Or run manual query against Daraja Transaction Status API via Admin portal (`/admin/payments`).

---

## 3. Database Backup & Disaster Recovery

### Automated Daily Backup
```bash
pg_dump -Fc --no-acl --no-owner -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backups/haraka_$(date +%Y%m%d_%H%M%S).dump.gz
```

### Restoration Drill
```bash
createdb -h $DB_HOST -U $DB_USER haraka_restore
gunzip -c /backups/haraka_backup.dump.gz | pg_restore -h $DB_HOST -U $DB_USER -d haraka_restore
```
Target RPO: 24 hours (point-in-time recovery target: 15 minutes with WAL archiving). Target RTO: 30 minutes.
