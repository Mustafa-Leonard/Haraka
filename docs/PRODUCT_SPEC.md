# Haraka — Product Specification & Business Requirements

## 1. Product Overview & Vision

Haraka ("quick" in Swahili) is an on-demand delivery and logistics platform operating across coastal Kenya (launch markets: Kilifi, Malindi, Mombasa). It connects local merchants, businesses, individual senders, verified boda-boda and tuk-tuk riders, delivery recipients, and operations dispatchers.

The primary mission is to offer instant, predictable, reliable local delivery with transparent pricing, cryptographically secure verification (pickup & delivery PINs), M-Pesa STK push and Cash on Delivery (COD) workflows, live tracking, and an append-only double-entry ledger.

---

## 2. Operating Zones & Expansion

1. **Kilifi** (town, Old Town, Bofa, Sea Horse, Pwani University corridor)
2. **Malindi** (town centre, Casuarina, Mtangani, Malindi airport corridor)
3. **Mombasa** (Island, Nyali, Bamburi, Likoni ferry link, Changamwe)

Zones are defined dynamically in `service_zones` with configurable boundaries, base pricing, and surcharges. Additional Kenyan towns can be introduced via database configuration without code changes.

Merchants select an active service zone when requesting a quote. Pricing must use an active rule for the selected zone and vehicle; a missing rule makes that quote unavailable rather than falling back to a global rule. Quote coordinates and selected zone are locked for booking. Enforcing that both coordinates fall inside the selected zone boundary remains a launch requirement and is not currently implemented.

---

## 3. Primary Actors & Permissions Boundary

### 3.1 Merchant / Sender

- Registered business or individual with verified Kenyan phone (+254).
- Can request instant delivery quotes, book delivery jobs, track live jobs, cancel jobs prior to pickup, manage saved addresses and contacts, review payment and delivery receipts, and submit ratings or disputes.
- Cannot see other merchants' jobs or private rider credentials.

### 3.2 Rider (Boda-boda & Tuk-tuk)

- Verified operator with validated Kenyan National ID, driving license, vehicle registration, and active vehicle assignment.
- Must be approved by Admin before going online.
- Receives exclusive 15-second delivery offers based on spatial proximity.
- Updates live status: Online/Offline, arrives at pickup, verifies pickup PIN, transports parcel, arrives at dropoff, confirms delivery with recipient PIN.
- Collects COD when designated, views daily/weekly earnings, requests payouts.
- Offline-first PWA with IndexedDB queue for network drops.

### 3.3 Recipient (Public / Lightweight)

- Does not require a registered account.
- Receives SMS tracking link with opaque, single-purpose tracking token (`/track/:token`).
- Views restricted live map (rider position, status timeline, ETA, vehicle plate).
- Receives confidential delivery PIN via private SMS to verbally provide to rider upon arrival.
- Can report delivery issues or rate the completed delivery.

### 3.4 Dispatcher

- Haraka operations employee with backoffice access.
- Monitors live fleet and active deliveries on dispatcher map.
- Handles matching escalations (when automated offers expire after 5 attempts).
- Performs manual rider assignment or reassignment with mandatory audit trail.
- Manages disputes, exceptions, and rider communications.

### 3.5 Administrator & Super Admin

- Staff authenticate with a Kenyan phone number, password, selected staff role, and mandatory TOTP 2FA. New staff enrollment must complete before any authenticated session is issued, except for the explicitly opted-in, loopback-only local development MFA bypass used for UI testing.
- SMS OTP is not used for routine login; it is reserved for password recovery. TOTP remains mandatory for privileged staff.
- Full platform oversight: rider verification approval/rejection/suspension, pricing rule management, service zone management, financial reconciliation, ledger inspection, role-based access control, system settings, and data privacy requests.
- Staff access follows least privilege: `ADMIN` and `SUPER_ADMIN` have full operations access; `DISPATCHER` handles fleet, delivery assignment/cancellation, and dispute resolution; `SUPPORT` has read-only delivery/dispute access with dispute escalation; `FINANCE` has read-only ledger and financial-summary access; `VERIFICATION_OFFICER` can review, approve, or reject pending rider applications with a recorded reason, but cannot suspend or reactivate accounts.
- The selected role is checked server-side before a staff MFA challenge or local development session is issued. The login selector is not an authorization grant. Every protected endpoint remains guarded server-side.

### 3.6 Customer Authentication and Recovery

- Merchants and riders register with a Kenyan phone number and password. The phone number is the sign-in identifier for every account type; email is optional and is not a login identifier.
- The public authentication page requires a portal role selection for merchant or rider sign-in and registration. The API verifies the selected role against the account before issuing a session, then routes to the selected workspace. Public registration cannot assign staff roles; new rider profiles start pending and require operations approval before going online.
- Passwords are stored using Argon2id, require at least 8 characters, and are checked against common passwords. Login errors do not reveal whether the phone number exists; failed attempts are rate-limited and temporarily locked.
- SMS OTP is used only for password recovery, not account verification or routine sign-in. Password recovery supports SMS OTP and a time-limited, single-use email reset link.
- Password reset revokes active sessions. Staff sign in with phone and password, then complete mandatory TOTP MFA before receiving an authenticated session outside the explicitly opted-in, loopback-only local development bypass.

---

4. Core Delivery Lifecycle (State Machine)

The state machine is authoritative in the backend (`apps/api/src/jobs/`).

```
[REQUESTED]
    │
    ▼
[MATCHING] ──(Timeout after 5 offers)──► [ESCALATED_DISPATCHER]
    │
    ▼
[OFFERED] (15-second window per rider)
    │
    ▼
[ACCEPTED]
    │
    ▼
[ARRIVED_PICKUP]
    │  (Merchant gives Pickup PIN -> Rider inputs PIN)
    ▼
[PICKED_UP]
    │
    ▼
[IN_TRANSIT]
    │
    ▼
[ARRIVED_DROPOFF]
    │  (Recipient gives Delivery PIN -> Rider inputs PIN)
    ▼
[DELIVERED]
    │
    ▼
[COMPLETED]
```

Side states:

- `CANCELLED`: Permitted before `PICKED_UP` with cancellation reason.
- `FAILED`: Inability to deliver, address unreachable, fraud suspicion.
- `DISPUTED`: Open dispute filed by merchant, rider, or recipient.
- `EXPIRED`: Unaccepted offers or unfulfilled bookings past SLA.

---

5. Financial Model & Double-Entry Ledger

- **Currency Unit**: Kenyan Shilling minor units (1 KES = 100 units). Never float arithmetic.
- **Pricing**: Base fee + per-km rate × parcel size multiplier + zone surcharge.
  - Boda default: KES 100 base + KES 40/km.
  - Tuk-tuk default: KES 200 base + KES 60/km.
- **Rider earnings**: An admin-configured percentage per zone/vehicle pricing rule, stored as basis points. The share applies to the full locked fare, including zone surcharge, and is snapshotted at quote and booking. The percentage is rounded half-up in integer minor units.
- **Fare rounding**: Quotes round half-up to whole KES for M-Pesa STK; rounding must not reduce a quote below the configured minimum rounded up to whole KES.
- **M-Pesa STK Push**: A callback is only a notification to query the provider. Before a payment can succeed or post ledger entries, the backend must independently verify the checkout request status with Daraja and match the verified result to the callback. Provider verification failure leaves the payment unchanged and retryable. Sandbox request simulation must never fabricate a successful payment or ledger posting.
- **Cash on Delivery (COD)**: A valid delivery PIN confirms that the rider collected the full locked fare. The platform records the rider-held cash and platform/rider split atomically; cash settlement remains a separate operational process.
- **Ledger Invariant**: $\sum \text{Debit} = \sum \text{Credit}$ for every transaction.
