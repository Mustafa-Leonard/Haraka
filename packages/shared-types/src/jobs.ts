import type {
  JobStatus,
  JobCancellationReason,
  VehicleType,
  ParcelSize,
  PaymentMethod,
  DistanceSource,
  OfferStatus,
} from './enums';

export interface JobSummaryDto {
  id: string;
  referenceCode: string;
  status: JobStatus;
  pickupTown: string;
  dropoffTown: string;
  recipientName: string;
  vehicleType: VehicleType;
  quotedAmount: number; // minor units
  currency: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  estimatedDeliveryAt: string | null;
}

export interface JobDetailDto extends JobSummaryDto {
  merchantId: string;
  riderId: string | null;
  pickup: AddressSnapshotDto;
  dropoff: AddressSnapshotDto;
  recipientPhone: string;
  parcelSize: ParcelSize;
  parcelDescription: string | null;
  isFragile: boolean;
  distanceMeters: number;
  distanceSource: DistanceSource;
  finalAmount: number | null;
  stateHistory: JobStateEventDto[];
  rider: RiderSummaryDto | null;
  publicTrackingToken: string | null;
  estimatedPickupAt: string | null;
  actualPickupAt: string | null;
  actualDeliveryAt: string | null;
  cancellationReason: JobCancellationReason | null;
  cancellationNote: string | null;
}

export interface AddressSnapshotDto {
  street: string;
  building: string | null;
  area: string;
  town: string;
  instructions: string | null;
  latitude: number;
  longitude: number;
}

export interface RiderSummaryDto {
  id: string;
  displayName: string | null;
  phone: string;
  avatarUrl: string | null;
  vehicleType: VehicleType;
  plateNumber: string | null;
  averageRating: number | null;
}

export interface JobStateEventDto {
  fromStatus: JobStatus | null;
  toStatus: JobStatus;
  reason: string | null;
  createdAt: string;
}

export interface CreateJobDto {
  quoteId: string;
  pickupAddressId?: string;
  pickupStreet: string;
  pickupBuilding?: string;
  pickupArea: string;
  pickupTown: string;
  pickupInstructions?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddressId?: string;
  dropoffStreet: string;
  dropoffBuilding?: string;
  dropoffArea: string;
  dropoffTown: string;
  dropoffInstructions?: string;
  dropoffLat: number;
  dropoffLng: number;
  recipientName: string;
  recipientPhone: string;
  vehicleType: VehicleType;
  parcelSize: ParcelSize;
  parcelDescription?: string;
  isFragile?: boolean;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
}

export interface QuoteRequestDto {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: VehicleType;
  parcelSize: ParcelSize;
  zoneSlug?: string;
}

export interface QuoteResponseDto {
  quoteId: string;
  vehicleType: VehicleType;
  parcelSize: ParcelSize;
  distanceMeters: number;
  distanceSource: DistanceSource;
  baseFare: number;
  distanceFare: number;
  parcelMultiplier: number;
  surcharge: number;
  totalAmount: number;
  currency: string;
  breakdown: QuoteBreakdownDto;
  pricingRuleVersion: number;
  expiresAt: string; // ISO8601
}

export interface QuoteBreakdownDto {
  baseFare: number;
  distanceKm: number;
  distanceFare: number;
  parcelSizeLabel: string;
  parcelMultiplier: number;
  surcharge: number;
  total: number;
  currency: string;
}

export interface JobOfferDto {
  offerId: string;
  jobId: string;
  status: OfferStatus;
  pickup: AddressSnapshotDto;
  dropoff: AddressSnapshotDto;
  recipientName: string;
  vehicleType: VehicleType;
  parcelSize: ParcelSize;
  distanceMeters: number;
  quotedAmount: number;
  currency: string;
  distanceToPickupMeters: number | null;
  expiresAt: string;
  offeredAt: string;
}

export interface CancelJobDto {
  reason?: string;
}

export interface PublicTrackingDto {
  referenceCode: string;
  status: JobStatus;
  pickup: PublicAddressDto;
  dropoff: PublicAddressDto;
  recipientName: string;
  vehicleType: VehicleType;
  estimatedDeliveryAt: string | null;
  actualDeliveryAt: string | null;
  riderName: string | null;
  riderVehiclePlate: string | null;
  lastLocation: PublicLocationDto | null;
  stateHistory: JobStateEventDto[];
  trackingInstruction: string; // "Show PIN to rider"
}

export interface PublicAddressDto {
  area: string;
  town: string;
  instructions: string | null;
}

export interface PublicLocationDto {
  latitude: number;
  longitude: number;
  recordedAt: string;
}
