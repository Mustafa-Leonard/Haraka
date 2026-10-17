import type { PaymentMethod, VehicleType } from './enums';

export interface MerchantProfileDto {
  id: string;
  userId: string;
  businessName: string;
  businessType: string | null;
  description: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface UpdateMerchantProfileDto {
  businessName?: string;
  businessType?: string;
  description?: string;
}

export interface AddressDto {
  id: string;
  label: string | null;
  street: string;
  building: string | null;
  area: string;
  town: string;
  instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressDto {
  label?: string;
  street: string;
  building?: string;
  area: string;
  town: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UpdateAddressDto extends Partial<CreateAddressDto> {}

export interface SavedContactDto {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
}

export interface MerchantDashboardDto {
  activeJobs: number;
  todayJobs: number;
  todayRevenue: number; // minor units
  currency: string;
  weeklyStats: WeeklyStatDto[];
}

export interface WeeklyStatDto {
  date: string;
  jobs: number;
  revenue: number;
}

export interface MerchantSettingsDto {
  defaultVehicleType: VehicleType;
  defaultPaymentMethod: PaymentMethod;
  notifyOnPickup: boolean;
  notifyOnDelivery: boolean;
  notifyRecipientBySms: boolean;
  requirePhotoProof: boolean;
}
