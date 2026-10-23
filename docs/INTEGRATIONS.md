# Haraka — Third-Party Integrations & Adapter Strategy

## 1. Safaricom Daraja (M-Pesa)

- **STK Push (Lipa Na M-Pesa Online)**:
  - Generates OAuth token via Basic Auth (`MPESA_CONSUMER_KEY:MPESA_CONSUMER_SECRET`).
  - Initiates STK push to customer's mobile number (`254XXXXXXXXX`).
  - Stores `MerchantRequestID` and `CheckoutRequestID` in database.
  - Receives asynchronous result via `/api/v1/payments/mpesa/callback`.
  - Automated callback reconciliation and retry behavior have not been verified.
- **B2C (Business to Customer) Payouts**:
  - Not implemented. Payout requests are persisted, but funds are not disbursed.
- **Sandbox Adapter**:
  - `MPESA_ENV=sandbox` enables the explicitly labelled sandbox simulator. It is not a live provider response and must not be used to represent production payment success.

---

## 2. Africa's Talking (SMS Gateway)

- **Use Cases**: OTP delivery, booking confirmations, rider arrival alerts, delivery PINs.
- **Adapter**: API dispatches SMS synchronously. Live requests require `AT_ENV=production` and valid Africa's Talking credentials. `AT_ENV=sandbox` returns an explicitly marked sandbox result and does not contact the provider.
- **Sensitive data**: The adapter does not log recipient numbers or message bodies. OTP, booking PIN, and delivery PIN bodies are redacted before notification persistence.
- **Reliability gap**: Business notifications are not yet written to a transactional outbox. The BullMQ notification worker has no producer wired to it, so API SMS delivery does not use worker retry/dead-letter handling.

---

## 3. Resend (Account Email)

- **Use Cases**: Optional email verification and password-reset links.
- **Configuration**: Set `RESEND_API_KEY`, `EMAIL_FROM` to an address on a verified Resend domain, and `WEB_APP_URL` to the public application URL. Production requires HTTPS.
- **Security**: Email action tokens are random, SHA-256 hashed in the database, expire, and are single-use. Email addresses must be verified before email sign-in or email password recovery.
- **Failure behavior**: Email delivery errors are logged and returned as service errors for email recovery. Registration still succeeds if optional verification email delivery fails; users can sign in by verified phone and request the verification link again.

---

## 3. Geocoding & Routing Engine

- **Primary**: OSRM (Open Source Routing Machine) or OpenRouteService API.
- **Fallback**: Haversine distance with a coastal road winding factor ($1.3\times$).
- **Labels**: All quotes explicitly indicate `distanceSource: 'OSRM' | 'OPENROUTESERVICE' | 'HAVERSINE_ESTIMATE'`.
