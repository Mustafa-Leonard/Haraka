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
- Privileged staff with mandatory TOTP 2FA.
- Full platform oversight: rider verification approval/rejection/suspension, pricing rule management, service zone management, financial reconciliation, ledger inspection, role-based access control, system settings, and data privacy requests.

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
- **M-Pesa STK Push**: Instant payment capture with webhook callback and status polling fallback.
- **Cash on Delivery (COD)**: Rider collects cash, platform records rider-held funds liability, settles during scheduled settlement.
- **Ledger Invariant**: $\sum \text{Debit} = \sum \text{Credit}$ for every transaction.
