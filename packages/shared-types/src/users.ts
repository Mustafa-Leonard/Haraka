import type { UserRole } from './enums';

export interface UserProfileDto {
  id: string;
  phone: string;
  email: string | null;
  displayName: string | null;
  preferredLanguage: string;
  roles: UserRole[];
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  email?: string;
  preferredLanguage?: string;
}
