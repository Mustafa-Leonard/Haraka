# Haraka — REST API Contracts & Conventions

## 1. Global Conventions
- **Base URL**: `/api/v1`
- **Data formats**: JSON for request and response payloads.
- **Authentication**: `Authorization: Bearer <accessToken>` or `haraka_refresh` HTTP-only cookie for session renewal.
- **Idempotency**: Mutating requests (jobs, payments) accept `X-Idempotency-Key: <UUID>` header.
- **Correlation**: All requests tagged with `X-Request-ID`.

---

## 2. Standard Responses

### 2.1 Success Wrapper
```json
{
  "data": { ... },
  "meta": {
    "requestId": "a4f89d32b5"
  }
}
```

### 2.2 Paginated Wrapper
```json
{
  "data": [ ... ],
  "meta": {
    "total": 128,
    "page": 1,
    "limit": 20,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2.3 Structured Error Format
```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "requestId": "a4f89d32b5",
  "details": [
    {
      "field": "recipientPhone",
      "message": "Enter a valid Kenyan phone number (e.g. 0712 345 678)",
      "code": "invalid_string"
    }
  ]
}
```

---

## 3. Core Endpoint Inventory

### Authentication
- `POST /api/v1/auth/otp/request` — Request OTP SMS (Rate limited: 5/15m)
- `POST /api/v1/auth/otp/verify` — Verify code, sets `haraka_refresh` cookie, returns JWT
- `POST /api/v1/auth/refresh` — Issue new short-lived JWT using cookie
- `POST /api/v1/auth/logout` — Revokes session and clears cookie
- `GET /api/v1/auth/sessions` — List active login sessions
- `DELETE /api/v1/auth/sessions/:id` — Revoke specific session

### Merchant
- `GET /api/v1/merchant/profile`
- `PATCH /api/v1/merchant/profile`
- `GET /api/v1/merchant/dashboard` — Statistics (active, today, revenue)
- `GET /api/v1/merchant/jobs` — Paginated jobs list with status filter
- `POST /api/v1/merchant/jobs/quote` — Obtain locked pricing quote (5-min validity)
- `POST /api/v1/merchant/jobs` — Create delivery order from quote
- `GET /api/v1/merchant/jobs/:id` — Detail view with pickup PIN & timeline
- `POST /api/v1/merchant/jobs/:id/cancel` — Cancel pending booking
- `GET /api/v1/merchant/addresses` — Manage saved addresses
- `POST /api/v1/merchant/addresses`

### Rider
- `GET /api/v1/rider/profile`
- `POST /api/v1/rider/availability` — Toggle Online/Offline
- `GET /api/v1/rider/offers` — View current pending delivery offer
- `POST /api/v1/rider/offers/:id/accept` — Accept 15-second offer
- `POST /api/v1/rider/offers/:id/decline` — Decline offer
- `POST /api/v1/rider/location` — Ingest high-frequency GPS coordinate
- `POST /api/v1/rider/jobs/:id/arrive-pickup` — Signal arrival at merchant
- `POST /api/v1/rider/jobs/:id/pickup` — Submit merchant pickup PIN
- `POST /api/v1/rider/jobs/:id/arrive-dropoff` — Signal arrival at recipient
- `POST /api/v1/rider/jobs/:id/deliver` — Submit recipient delivery PIN
- `GET /api/v1/rider/earnings` — Earnings summary & breakdown
- `GET /api/v1/rider/payouts` — Payout history

### Public (Recipient)
- `GET /api/v1/public/tracking/:token` — Sanitized live parcel status & map
- `POST /api/v1/public/tracking/:token/report` — Report problem
- `POST /api/v1/public/tracking/:token/rating` — Rate completed delivery

### Operations & Admin
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/fleet` — Live fleet positions
- `POST /api/v1/admin/dispatch/:jobId/assign` — Manual rider assignment
- `POST /api/v1/admin/riders/:id/approve`
- `POST /api/v1/admin/riders/:id/suspend`
- `GET /api/v1/admin/pricing` — Manage pricing rules & service zones
- `GET /api/v1/admin/ledger` — Inspect double-entry balance sheets & audit logs
- `GET /api/v1/health/live`, `GET /api/v1/health/ready`, and `GET /api/v1/health` — Health monitoring probes
