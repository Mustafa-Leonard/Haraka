import type { VehicleType, ParcelSize } from './enums';

export interface PricingRuleDto {
  id: string;
  zoneId: string | null;
  zoneName: string | null;
  vehicleType: VehicleType;
  baseFare: number; // minor units
  perKmRate: number; // minor units
  minimumFare: number; // minor units
  riderShareBps: number | null;
  parcelMultipliers: ParcelMultiplierDto[];
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
}

export interface ParcelMultiplierDto {
  parcelSize: ParcelSize;
  multiplier: number;
}

export interface ServiceZoneDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface UpdatePricingRuleDto {
  baseFare?: number;
  perKmRate?: number;
  minimumFare?: number;
  riderShareBps?: number;
  parcelMultipliers?: ParcelMultiplierDto[];
  notes?: string;
}
