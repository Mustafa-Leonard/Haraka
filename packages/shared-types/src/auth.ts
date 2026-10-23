// Authentication and session types

export interface AuthUser {
  id: string;
  phone: string;
  displayName: string | null;
  roles: string[];
  preferredLanguage: string;
  isActive: boolean;
  isSuspended: boolean;
}

export type CustomerPortalRole = 'MERCHANT' | 'RIDER';

export const STAFF_PORTAL_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'DISPATCHER',
  'SUPPORT',
  'FINANCE',
  'VERIFICATION_OFFICER',
] as const;

export type StaffPortalRole = (typeof STAFF_PORTAL_ROLES)[number];
export type LoginRole = CustomerPortalRole | StaffPortalRole;

export const ADMIN_WORKSPACE_ACCESS: Record<string, StaffPortalRole[]> = {
  '/admin': ['ADMIN', 'SUPER_ADMIN'],
  '/admin/fleet': ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER'],
  '/admin/jobs': ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT'],
  '/admin/riders': ['ADMIN', 'SUPER_ADMIN', 'VERIFICATION_OFFICER'],
  '/admin/pricing': ['ADMIN', 'SUPER_ADMIN'],
  '/admin/ledger': ['ADMIN', 'SUPER_ADMIN', 'FINANCE'],
  '/admin/disputes': ['ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT'],
  '/admin/audit': ['ADMIN', 'SUPER_ADMIN'],
};

export function isStaffPortalRole(role: string): role is StaffPortalRole {
  return STAFF_PORTAL_ROLES.includes(role as StaffPortalRole);
}

export function getStaffHomePath(roles: string[]): string {
  if (roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) return '/admin';
  if (roles.includes('DISPATCHER')) return '/admin/fleet';
  if (roles.includes('SUPPORT')) return '/admin/jobs';
  if (roles.includes('FINANCE')) return '/admin/ledger';
  if (roles.includes('VERIFICATION_OFFICER')) return '/admin/riders';
  return '/login';
}

export interface JwtPayload {
  sub: string; // userId
  phone: string;
  roles: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokensDto {
  accessToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

export interface StaffMfaChallengeDto {
  mfaRequired: true;
  challengeToken: string;
  setupRequired: boolean;
}

export interface AuthSessionDto extends AuthTokensDto {
  mfaRequired: false;
  user: AuthUser;
}

export type PasswordLoginResultDto = AuthSessionDto | StaffMfaChallengeDto;

export interface SessionDto {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface TotpEnrollDto {
  secret: string; // base32 encoded
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface TotpVerifyDto {
  code: string;
}

export interface RecoveryCodesDto {
  codes: string[]; // plaintext codes, shown once
}
