UPDATE "sessions" AS session
SET
  "isActive" = FALSE,
  "revokedAt" = CURRENT_TIMESTAMP,
  "revokedReason" = 'staff_mfa_enforcement'
FROM "users" AS user_account
WHERE session."userId" = user_account."id"
  AND session."isActive" = TRUE
  AND user_account."roles" && ARRAY['ADMIN', 'SUPER_ADMIN', 'DISPATCHER']::"UserRole"[];
