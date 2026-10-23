DELETE FROM "otp_codes"
WHERE "purpose" <> 'password_reset';

ALTER TABLE "otp_codes"
ADD CONSTRAINT "otp_codes_password_reset_only"
CHECK ("purpose" = 'password_reset');
