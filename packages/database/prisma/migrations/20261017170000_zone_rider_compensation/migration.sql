ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'RIDER_EARNING';

ALTER TABLE "pricing_rules"
  ADD COLUMN IF NOT EXISTS "riderShareBps" INTEGER;

ALTER TABLE "route_quotes"
  ADD COLUMN IF NOT EXISTS "zoneId" UUID,
  ADD COLUMN IF NOT EXISTS "riderShareBps" INTEGER;

ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "riderShareBps" INTEGER,
  ADD COLUMN IF NOT EXISTS "riderShareAmount" INTEGER;

ALTER TABLE "ledger_transactions"
  ADD COLUMN IF NOT EXISTS "jobId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_rider_share_bps_check'
  ) THEN
    ALTER TABLE "pricing_rules"
      ADD CONSTRAINT "pricing_rules_rider_share_bps_check"
      CHECK ("riderShareBps" IS NULL OR "riderShareBps" BETWEEN 0 AND 10000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'route_quotes_rider_share_bps_check'
  ) THEN
    ALTER TABLE "route_quotes"
      ADD CONSTRAINT "route_quotes_rider_share_bps_check"
      CHECK ("riderShareBps" IS NULL OR "riderShareBps" BETWEEN 0 AND 10000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_rider_share_bps_check'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_rider_share_bps_check"
      CHECK ("riderShareBps" IS NULL OR "riderShareBps" BETWEEN 0 AND 10000);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_transactions_jobId_key"
  ON "ledger_transactions"("jobId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint     WHERE conname = 'route_quotes_zoneId_fkey'
  ) THEN
    ALTER TABLE "route_quotes"
      ADD CONSTRAINT "route_quotes_zoneId_fkey"
      FOREIGN KEY ("zoneId") REFERENCES "service_zones"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint     WHERE conname = 'ledger_transactions_jobId_fkey'
  ) THEN
    ALTER TABLE "ledger_transactions"
      ADD CONSTRAINT "ledger_transactions_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "jobs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
