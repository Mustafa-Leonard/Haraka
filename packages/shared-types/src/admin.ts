import type { RiderOnlineStatus } from './enums';

export interface AdminFleetRiderDto {
  id: string;
  name: string | null;
  phone: string;
  status: RiderOnlineStatus;
  lat: number | null;
  lng: number | null;
  vehicle: string | null;
}
