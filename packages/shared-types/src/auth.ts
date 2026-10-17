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

export interface JwtPayload {
  sub: string; // userId
  phone: string;
  roles: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface OtpRequestDto {
  phone: string;
  purpose?: 'auth' | 'phone_verify';
}

export interface OtpVerifyDto {
  phone: string;
  code: string;
  purpose?: 'auth' | 'phone_verify';
}

export interface AuthTokensDto {
  accessToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

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
