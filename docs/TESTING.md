# Haraka — Testing Strategy & Verification Gates

## 1. Test Levels & Objectives
- **Unit Testing (Vitest)**: Fast, deterministic tests for business invariants:
  - Pricing calculation (base, distance, parcel size multiplier, zone surcharge).
  - Job state machine transitions (legal vs illegal transitions).
  - OTP generation, hashing, and attempt expiration.
  - Double-entry ledger balance ($\sum \text{Debit} = \sum \text{Credit}$).
  - Kenyan phone normalization (+254 E.164 format).
- **Integration Testing (Supertest + Vitest)**:
  - Database repository and migration tests.
  - API endpoint authentication, authorization guards, and validation errors.
  - Concurrent job offer acceptance safety.
- **End-to-End Testing (Playwright)**:
  - Complete lifecycle from merchant booking, rider offer acceptance, pickup PIN submission, transit, dropoff PIN delivery, and completion.
- **Load Testing (k6)**:
  - Scenarios for 1,000 concurrent virtual users and 500 GPS location streams.

---

## 2. Running Automated Tests
```bash
# Run unit & integration tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run Playwright E2E tests
pnpm test:e2e
```
