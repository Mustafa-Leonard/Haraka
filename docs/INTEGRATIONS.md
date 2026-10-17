# Haraka — Third-Party Integrations & Adapter Strategy

## 1. Safaricom Daraja (M-Pesa)
- **STK Push (Lipa Na M-Pesa Online)**:
  - Generates OAuth token via Basic Auth (`MPESA_CONSUMER_KEY:MPESA_CONSUMER_SECRET`).
  - Initiates STK push to customer's mobile number (`254XXXXXXXXX`).
  - Stores `MerchantRequestID` and `CheckoutRequestID` in database.
  - Receives asynchronous result via `/api/v1/payments/mpesa/callback`.
  - Background polling worker verifies pending transactions after 60 seconds if callback not received.
- **B2C (Business to Customer) Payouts**:
  - Secure rider payouts directly to M-Pesa wallet.
- **Sandbox Adapter**:
  - When `MPESA_ENV=sandbox` without valid credentials, the internal mock simulator generates realistic STK responses and delays to test async UI feedback. Clearly flagged as sandbox mode.

---

## 2. Africa's Talking (SMS Gateway)
- **Use Cases**: OTP delivery, booking confirmations, rider arrival alerts, delivery PINs.
- **Outbox Pattern**: Notifications written to `outbox_events` within the business transaction.
- **Adapter**: Implements `SmsProviderInterface`. In sandbox mode (`AT_ENV=sandbox`), logs formatted SMS messages to the console and database without incurring credit charges.

---

## 3. Geocoding & Routing Engine
- **Primary**: OSRM (Open Source Routing Machine) or OpenRouteService API.
- **Fallback**: Haversine distance with a coastal road winding factor ($1.3\times$).
- **Labels**: All quotes explicitly indicate `distanceSource: 'OSRM' | 'OPENROUTESERVICE' | 'HAVERSINE_ESTIMATE'`.
