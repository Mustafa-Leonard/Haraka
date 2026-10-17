// =============================================================================
// ENUMS — shared across all applications
// Keep in sync with packages/database/prisma/schema.prisma
// =============================================================================

export type UserRole = 'MERCHANT' | 'RIDER' | 'DISPATCHER' | 'ADMIN' | 'SUPER_ADMIN';

export type VerificationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type RiderOnlineStatus = 'OFFLINE' | 'ONLINE' | 'ON_JOB' | 'BREAK';

export type VehicleType = 'BODA' | 'TUKTUK' | 'MINIVAN';

export type ParcelSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';

export type JobStatus =
  | 'REQUESTED'
  | 'MATCHING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'ARRIVED_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED_DROPOFF'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'DISPUTED'
  | 'EXPIRED';

export type JobCancellationReason =
  | 'MERCHANT_CANCELLED'
  | 'RIDER_CANCELLED'
  | 'NO_RIDER_FOUND'
  | 'SYSTEM_CANCELLED'
  | 'ADMIN_CANCELLED'
  | 'PAYMENT_FAILED'
  | 'EXPIRED';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

export type PaymentMethod = 'MPESA_STK' | 'CASH_ON_DELIVERY' | 'WALLET';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'UNKNOWN'
  | 'REQUIRES_ACTION';

export type CODStatus =
  | 'PENDING_COLLECTION'
  | 'COLLECTED_BY_RIDER'
  | 'SETTLEMENT_PENDING'
  | 'SETTLED'
  | 'DISPUTED';

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';

export type DisputeResolution =
  | 'MERCHANT_FAVOUR'
  | 'RIDER_FAVOUR'
  | 'PARTIAL_REFUND'
  | 'FULL_REFUND'
  | 'NO_ACTION';

export type DistanceSource = 'OSRM' | 'OPENROUTESERVICE' | 'HAVERSINE_ESTIMATE';

export type Language = 'en' | 'sw';

/** Valid job state transitions. Key = from state, Value = allowed to-states */
export const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  REQUESTED: ['MATCHING', 'CANCELLED'],
  MATCHING: ['OFFERED', 'CANCELLED', 'EXPIRED'],
  OFFERED: ['ACCEPTED', 'MATCHING', 'CANCELLED', 'EXPIRED'],
  ACCEPTED: ['ARRIVED_PICKUP', 'CANCELLED', 'FAILED'],
  ARRIVED_PICKUP: ['PICKED_UP', 'CANCELLED', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['ARRIVED_DROPOFF', 'FAILED'],
  ARRIVED_DROPOFF: ['DELIVERED', 'FAILED'],
  DELIVERED: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['DISPUTED'],
  CANCELLED: [],
  FAILED: [],
  DISPUTED: ['COMPLETED', 'CANCELLED'],
  EXPIRED: [],
};

/** Terminal states that cannot transition further */
export const TERMINAL_JOB_STATES: JobStatus[] = ['COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED'];

/** States where a rider is actively working a job */
export const ACTIVE_RIDER_STATES: JobStatus[] = [
  'ACCEPTED',
  'ARRIVED_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED_DROPOFF',
];
