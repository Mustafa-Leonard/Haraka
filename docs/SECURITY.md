# Haraka — Security Architecture & Controls

## 1. Security Architecture Principles (CIA & AAA)

- **Confidentiality**: Field-level encryption for National IDs and TOTP secrets using AES-256-GCM with managed keys. Zero logging of credentials, PINs, tokens, or plaintext phone numbers in production.
- **Integrity**: Cryptographic hashing (Argon2id) for PINs, OTPs, and TOTP recovery codes. Append-only ledger transactions and immutable audit logging. Server-side authoritative state machine.
- **Availability**: Redis-backed rate limiting per IP and per phone number. Request size bounds (10MB body, 5MB uploads). Circuit breakers on third-party APIs. Graceful degradation to Haversine routing.

---

## 2. Authentication & Session Security

- **Short-Lived Access Tokens**: JWTs expire in 15 minutes.
- **Rotating Refresh Tokens**: Random 48-byte cryptographically secure tokens stored hashed (SHA-256) in the database and delivered via `httpOnly`, `Secure`, `SameSite=Lax` cookies. Token reuse triggers immediate invalidation of the entire session tree.
- **Admin MFA**: Time-based One-Time Passwords (TOTP RFC 6238) with Argon2id-hashed backup recovery codes.
- **OTP Verification**:
  - Expiry: 10 minutes.
  - Rate limiting: 5 requests per 15 minutes per IP; 60s cooldown per phone.
  - Lockout: Account locked after 5 consecutive incorrect attempts.
  - Timing attack protection: Fixed-time verification and non-enumerating generic success responses.

---

## 3. Authorization & Deny-by-Default RBAC

Authorization is enforced server-side via `JwtAuthGuard` and `RolesGuard`.
- Merchants can only query and mutate their own jobs, addresses, and wallets.
- Riders can only inspect offers explicitly assigned to them and accept jobs within the 15-second matching window.
- Unverified or suspended riders are rejected from going online or receiving offers.
- Public tracking tokens expose only sanitized fields (recipient name, vehicle plate, dropoff town, live coordinate). Pickup/delivery PINs, merchant billing amounts, and rider phone numbers are excluded.
