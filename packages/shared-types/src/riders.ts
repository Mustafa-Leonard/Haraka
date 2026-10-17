import type { VehicleType, VerificationStatus, RiderOnlineStatus } from './enums';

export interface RiderProfileDto {
  id: string;
  userId: string;
  displayName: string | null;
  phone: string;
  avatarUrl: string | null;
  verificationStatus: VerificationStatus;
  onlineStatus: RiderOnlineStatus;
  averageRating: number | null;
  ratingCount: number;
  totalDeliveries: number;
  primaryVehicle: VehicleSummaryDto | null;
  createdAt: string;
}

export interface VehicleSummaryDto {
  id: string;
  type: VehicleType;
  plateNumber: string;
  make: string | null;
  model: string | null;
  color: string | null;
}

export interface RiderLocationDto {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  recordedAt: string; // ISO8601
}

export interface RiderEarningsDto {
  period: string;
  totalEarned: number; // minor units
  totalJobs: number;
  currency: string;
  breakdown: EarningBreakdownDto[];
}

export interface EarningBreakdownDto {
  date: string;
  jobs: number;
  earned: number; // minor units
}

export interface RiderAvailabilityToggleDto {
  online: boolean;
}
