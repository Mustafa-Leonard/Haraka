// =============================================================================
// HARAKA SHARED CONFIGURATION CONSTANTS
// =============================================================================

export const APP_NAME = 'Haraka';
export const APP_SLOGAN = 'On-Demand Delivery for Coastal Kenya';
export const TIMEZONE = 'Africa/Nairobi';
export const DEFAULT_CURRENCY = 'KES';

export const SUPPORTED_TOWNS = [
  { name: 'Kilifi', slug: 'kilifi', lat: -3.6305, lng: 39.8499 },
  { name: 'Malindi', slug: 'malindi', lat: -3.2192, lng: 40.1169 },
  { name: 'Mombasa', slug: 'mombasa', lat: -4.0435, lng: 39.6682 },
] as const;

export const DEFAULT_PRICING = {
  BODA: {
    baseFare: 10000,    // KES 100.00
    perKmRate: 4000,    // KES 40.00 / km
    minimumFare: 10000, // KES 100.00
  },
  TUKTUK: {
    baseFare: 20000,    // KES 200.00
    perKmRate: 6000,    // KES 60.00 / km
    minimumFare: 20000, // KES 200.00
  },
  MINIVAN: {
    baseFare: 50000,    // KES 500.00
    perKmRate: 10000,   // KES 100.00 / km
    minimumFare: 50000, // KES 500.00
  },
} as const;

export const PARCEL_SIZE_MULTIPLIERS = {
  SMALL: 1.0,
  MEDIUM: 1.25,
  LARGE: 1.6,
  EXTRA_LARGE: 2.2,
} as const;

export const SLA = {
  OFFER_EXPIRY_SECONDS: 15,
  MAX_OFFER_ATTEMPTS: 5,
  QUOTE_EXPIRY_MINUTES: 5,
  SEARCH_RADIUS_METERS: 5000,
} as const;

export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    VERIFY: '/verify',
  },
  MERCHANT: {
    DASHBOARD: '/merchant',
    NEW_DELIVERY: '/merchant/new-delivery',
    JOBS: '/merchant/jobs',
    JOB_DETAIL: (id: string) => `/merchant/jobs/${id}`,
    ADDRESSES: '/merchant/addresses',
    SETTINGS: '/merchant/settings',
    PAYMENTS: '/merchant/payments',
  },
  RIDER: {
    HOME: '/rider',
    OFFERS: '/rider/offers',
    ACTIVE: '/rider/active',
    EARNINGS: '/rider/earnings',
    DOCUMENTS: '/rider/documents',
    SETTINGS: '/rider/settings',
  },
  ADMIN: {
    DASHBOARD: '/admin',
    FLEET: '/admin/fleet',
    JOBS: '/admin/jobs',
    RIDERS: '/admin/riders',
    MERCHANTS: '/admin/merchants',
    PRICING: '/admin/pricing',
    LEDGER: '/admin/ledger',
    DISPUTES: '/admin/disputes',
  },
  PUBLIC: {
    HOME: '/',
    PRICING: '/pricing',
    TRACKING: (token: string) => `/track/${token}`,
  },
} as const;
