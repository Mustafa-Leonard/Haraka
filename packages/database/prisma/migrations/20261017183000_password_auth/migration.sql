CREATE TYPE "AuthActionPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

ALTER TABLE "users"
  ADD COLUMN "passwordHash" VARCHAR(255);

CREATE TABLE "auth_action_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "purpose" "AuthActionPurpose" NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_action_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_action_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "auth_action_tokens_tokenHash_key"
  ON "auth_action_tokens"("tokenHash");
CREATE INDEX "auth_action_tokens_userId_purpose_expiresAt_idx"
  ON "auth_action_tokens"("userId", "purpose", "expiresAt");
