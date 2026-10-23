import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  AuthTokensDto,
  AuthUser,
  CustomerPortalRole,
  LoginRole,
  QuoteRequestDto,
  QuoteResponseDto,
  CreateJobDto,
  JobDetailDto,
  JobSummaryDto,
  JobOfferDto,
  RiderLocationDto,
  PublicTrackingDto,
  MerchantDashboardDto,
  RiderEarningsDto,
  RiderProfileDto,
  AddressDto,
  CreateAddressDto,
  PricingRuleDto,
  ServiceZoneDto,
  LedgerSummaryDto,
  InitiateMpesaDto,
  PaymentDto,
  AdminFleetRiderDto,
  PasswordLoginResultDto,
  StaffMfaChallengeDto,
  TotpEnrollDto,
} from '@haraka/shared-types';

export class HarakaApiClient {
  private readonly http: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL = '/api/v1') {
    this.http = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.http.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/')
        ) {
          originalRequest._retry = true;
          try {
            const refreshRes =
              await this.http.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
            const newToken = refreshRes.data.data.accessToken;
            this.setToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.http(originalRequest);
          } catch (refreshErr) {
            this.clearToken();
            return Promise.reject(refreshErr);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  setToken(token: string | null) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async beginStaffMfaEnrollment(challengeToken: string) {
    const res = await this.http.post<ApiResponse<TotpEnrollDto>>('/auth/staff/mfa/enroll', {
      challengeToken,
    });
    return res.data.data;
  }

  async completeStaffMfa(challengeToken: string, code: string) {
    const res = await this.http.post<
      ApiResponse<{ accessToken: string; expiresIn: number; user: AuthUser }>
    >('/auth/staff/mfa/verify', { challengeToken, code });
    this.setToken(res.data.data.accessToken);
    return res.data.data;
  }

  async register(params: {
    fullName: string;
    phone: string;
    role: CustomerPortalRole;
    password: string;
    confirmPassword: string;
  }) {
    const res = await this.http.post<
      ApiResponse<{
        phone: string;
        displayName: string;
      }> & { message: string }
    >('/auth/register', params);
    return res.data;
  }

  async loginWithPassword(
    phone: string,
    password: string,
    role?: LoginRole,
  ): Promise<PasswordLoginResultDto> {
    const res = await this.http.post<ApiResponse<PasswordLoginResultDto>>('/auth/password/login', {
      phone,
      password,
      ...(role ? { role } : {}),
    });
    if (!res.data.data.mfaRequired) {
      this.setToken(res.data.data.accessToken);
    }
    return res.data.data;
  }

  async requestPhonePasswordReset(phone: string) {
    const res = await this.http.post<{ message: string }>('/auth/password/reset/phone/request', {
      phone,
    });
    return res.data;
  }

  async resetPasswordWithPhone(phone: string, code: string, password: string) {
    const res = await this.http.post<{ message: string }>('/auth/password/reset/phone/complete', {
      phone,
      code,
      password,
    });
    return res.data;
  }

  async requestEmailPasswordReset(email: string) {
    const res = await this.http.post<{ message: string }>('/auth/password/reset/email/request', {
      email,
    });
    return res.data;
  }

  async resetPasswordWithEmail(token: string, password: string) {
    const res = await this.http.post<{ message: string }>('/auth/password/reset/email/complete', {
      token,
      password,
    });
    return res.data;
  }

  async requestEmailVerification(email: string) {
    const res = await this.http.post<{ message: string }>('/auth/email/verification/request', {
      email,
    });
    return res.data;
  }

  async verifyEmail(token: string) {
    const res = await this.http.post<{ message: string }>('/auth/email/verification/complete', {
      token,
    });
    return res.data;
  }

  async logout() {
    await this.http.post('/auth/logout');
    this.clearToken();
  }

  async getMe() {
    const res = await this.http.get<ApiResponse<AuthUser>>('/auth/me');
    return res.data.data;
  }

  // ─── Merchant ────────────────────────────────────────────────────────────────

  async getMerchantDashboard() {
    const res = await this.http.get<ApiResponse<MerchantDashboardDto>>('/merchant/dashboard');
    return res.data.data;
  }

  async getQuote(params: QuoteRequestDto) {
    const res = await this.http.post<ApiResponse<QuoteResponseDto>>('/merchant/jobs/quote', params);
    return res.data.data;
  }

  async getActiveServiceZones() {
    const res = await this.http.get<ApiResponse<ServiceZoneDto[]>>('/merchant/pricing/zones');
    return res.data.data;
  }

  async createJob(params: CreateJobDto, idempotencyKey?: string) {
    const config: AxiosRequestConfig = {};
    if (idempotencyKey) {
      config.headers = { 'X-Idempotency-Key': idempotencyKey };
    }
    const res = await this.http.post<ApiResponse<JobDetailDto>>('/merchant/jobs', params, config);
    return res.data.data;
  }

  async getMerchantJobs(page = 1, limit = 20) {
    const res = await this.http.get<PaginatedResponse<JobSummaryDto>>(
      `/merchant/jobs?page=${page}&limit=${limit}`,
    );
    return res.data;
  }

  async getMerchantJob(id: string) {
    const res = await this.http.get<ApiResponse<JobDetailDto>>(`/merchant/jobs/${id}`);
    return res.data.data;
  }

  async cancelJob(id: string, reason?: string) {
    const res = await this.http.post<ApiResponse<JobDetailDto>>(`/merchant/jobs/${id}/cancel`, {
      reason,
    });
    return res.data.data;
  }

  async getAddresses() {
    const res = await this.http.get<ApiResponse<AddressDto[]>>('/merchant/addresses');
    return res.data.data;
  }

  async createAddress(address: CreateAddressDto) {
    const res = await this.http.post<ApiResponse<AddressDto>>('/merchant/addresses', address);
    return res.data.data;
  }

  async deleteAddress(id: string) {
    const res = await this.http.delete<ApiResponse<{ success: boolean }>>(
      `/merchant/addresses/${id}`,
    );
    return res.data.data;
  }

  async getMerchantPayments(page = 1, limit = 20) {
    const res = await this.http.get<PaginatedResponse<any>>(
      `/merchant/payments?page=${page}&limit=${limit}`,
    );
    return res.data;
  }

  async initiateMpesaPayment(params: InitiateMpesaDto) {
    const res = await this.http.post<ApiResponse<PaymentDto>>('/merchant/payments/mpesa', params, {
      headers: params.idempotencyKey ? { 'X-Idempotency-Key': params.idempotencyKey } : undefined,
    });
    return res.data.data;
  }

  async getMerchantSettings() {
    const res = await this.http.get<ApiResponse<any>>('/merchant/settings');
    return res.data.data;
  }

  async updateMerchantSettings(settings: Record<string, unknown>) {
    const res = await this.http.patch<ApiResponse<any>>('/merchant/settings', settings);
    return res.data.data;
  }

  // ─── Rider ───────────────────────────────────────────────────────────────────

  async setRiderAvailability(online: boolean) {
    const res = await this.http.post<ApiResponse<{ online: boolean }>>('/rider/availability', {
      online,
    });
    return res.data.data;
  }

  async getRiderOffers() {
    const res = await this.http.get<ApiResponse<JobOfferDto[]>>('/rider/offers');
    return res.data.data;
  }

  async acceptOffer(offerId: string) {
    const res = await this.http.post<ApiResponse<{ success: boolean; jobId: string }>>(
      `/rider/offers/${offerId}/accept`,
    );
    return res.data.data;
  }

  async declineOffer(offerId: string, declineReason?: string) {
    const res = await this.http.post<ApiResponse<{ success: boolean }>>(
      `/rider/offers/${offerId}/decline`,
      { declineReason },
    );
    return res.data.data;
  }

  async sendLocation(loc: RiderLocationDto) {
    const res = await this.http.post<ApiResponse<{ received: boolean }>>('/rider/location', loc);
    return res.data.data;
  }

  async getRiderActiveJob() {
    const res = await this.http.get<ApiResponse<JobDetailDto | null>>('/rider/active-job');
    return res.data.data;
  }

  async riderArrivePickup(jobId: string) {
    const res = await this.http.post<ApiResponse<JobDetailDto>>(
      `/rider/jobs/${jobId}/arrive-pickup`,
    );
    return res.data.data;
  }

  async riderVerifyPickup(jobId: string, pin: string) {
    const res = await this.http.post<ApiResponse<JobDetailDto>>(`/rider/jobs/${jobId}/pickup`, {
      pin,
    });
    return res.data.data;
  }

  async riderArriveDropoff(jobId: string) {
    const res = await this.http.post<ApiResponse<JobDetailDto>>(
      `/rider/jobs/${jobId}/arrive-dropoff`,
    );
    return res.data.data;
  }

  async riderVerifyDelivery(jobId: string, pin: string) {
    const res = await this.http.post<ApiResponse<JobDetailDto>>(`/rider/jobs/${jobId}/deliver`, {
      pin,
    });
    return res.data.data;
  }

  async getRiderEarnings() {
    const res = await this.http.get<ApiResponse<RiderEarningsDto>>('/rider/earnings');
    return res.data.data;
  }

  async requestRiderPayout(amount: number) {
    const res = await this.http.post<
      ApiResponse<{ id: string; status: string; amount: number; currency: string }>
    >('/rider/payouts', { amount });
    return res.data.data;
  }

  async getRiderProfile() {
    const res = await this.http.get<ApiResponse<RiderProfileDto>>('/rider/profile');
    return res.data.data;
  }

  // ─── Public Tracking ─────────────────────────────────────────────────────────

  async getPublicTracking(token: string) {
    const res = await this.http.get<ApiResponse<PublicTrackingDto>>(`/public/tracking/${token}`);
    return res.data.data;
  }

  async reportPublicIssue(token: string, category: string, description: string) {
    const res = await this.http.post<ApiResponse<{ received: boolean }>>(
      `/public/tracking/${token}/report`,
      { category, description },
    );
    return res.data.data;
  }

  async submitPublicRating(token: string, score: number, comment?: string) {
    const res = await this.http.post<ApiResponse<{ received: boolean }>>(
      `/public/tracking/${token}/rating`,
      { score, comment },
    );
    return res.data.data;
  }

  // ─── Admin — Dashboard & Fleet ────────────────────────────────────────────────

  async adminGetDashboard() {
    const res = await this.http.get<ApiResponse<any>>('/admin/dashboard');
    return res.data.data;
  }

  async adminGetFleet() {
    const res = await this.http.get<ApiResponse<AdminFleetRiderDto[]>>('/admin/fleet');
    return res.data.data;
  }

  // ─── Admin — Jobs ─────────────────────────────────────────────────────────────

  async adminGetJobs(page = 1, limit = 20, status?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    const res = await this.http.get<PaginatedResponse<JobSummaryDto>>(`/admin/jobs?${params}`);
    return res.data;
  }

  async adminAssignJob(jobId: string, riderId: string) {
    const res = await this.http.post<ApiResponse<JobDetailDto>>(`/admin/jobs/${jobId}/assign`, {
      riderId,
    });
    return res.data.data;
  }

  async adminCancelJob(jobId: string, reason: string) {
    const res = await this.http.post<ApiResponse<JobDetailDto>>(`/admin/jobs/${jobId}/cancel`, {
      reason,
    });
    return res.data.data;
  }

  // ─── Admin — Riders ───────────────────────────────────────────────────────────

  async adminGetRiders(verificationStatus?: string) {
    const params = new URLSearchParams();
    if (verificationStatus) params.set('verificationStatus', verificationStatus);
    const res = await this.http.get<ApiResponse<any[]>>(`/admin/riders?${params}`);
    return res.data.data;
  }

  async approveRider(riderId: string) {
    const res = await this.http.post<ApiResponse<any>>(`/admin/riders/${riderId}/approve`);
    return res.data.data;
  }

  async rejectRider(riderId: string, reason: string) {
    const res = await this.http.post<ApiResponse<any>>(`/admin/riders/${riderId}/reject`, {
      reason,
    });
    return res.data.data;
  }

  async reactivateRider(riderId: string) {
    const res = await this.http.post<ApiResponse<any>>(`/admin/riders/${riderId}/reactivate`);
    return res.data.data;
  }

  async suspendRider(riderId: string, reason: string) {
    const res = await this.http.post<ApiResponse<any>>(`/admin/riders/${riderId}/suspend`, {
      reason,
    });
    return res.data.data;
  }

  // ─── Admin — Pricing ──────────────────────────────────────────────────────────

  async adminGetPricingRules() {
    const res = await this.http.get<ApiResponse<PricingRuleDto[]>>('/admin/pricing/rules');
    return res.data.data;
  }

  async adminUpdatePricingRule(ruleId: string, payload: Record<string, unknown>) {
    const res = await this.http.patch<ApiResponse<PricingRuleDto>>(
      `/admin/pricing/rules/${ruleId}`,
      payload,
    );
    return res.data.data;
  }

  async adminCreatePricingRule(payload: {
    zoneId: string;
    vehicleType: 'BODA' | 'TUKTUK' | 'MINIVAN';
    baseFare: number;
    perKmRate: number;
    minimumFare: number;
    riderShareBps: number;
  }) {
    const res = await this.http.post<ApiResponse<PricingRuleDto>>('/admin/pricing/rules', payload);
    return res.data.data;
  }

  async adminGetServiceZones() {
    const res = await this.http.get<ApiResponse<ServiceZoneDto[]>>('/admin/pricing/zones');
    return res.data.data;
  }

  async adminCreateServiceZone(payload: { name: string; slug: string; description?: string }) {
    const res = await this.http.post<ApiResponse<ServiceZoneDto>>('/admin/pricing/zones', payload);
    return res.data.data;
  }

  // ─── Admin — Ledger ───────────────────────────────────────────────────────────

  async adminGetLedgerSummary(period: string) {
    const res = await this.http.get<ApiResponse<{ accounts: LedgerSummaryDto[] }>>(
      `/admin/ledger/summary?period=${period}`,
    );
    return res.data.data;
  }

  async adminGetLedgerTransactions(page = 1, limit = 50, period?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (period) params.set('period', period);
    const res = await this.http.get<PaginatedResponse<any>>(`/admin/ledger/transactions?${params}`);
    return res.data;
  }

  // ─── Admin — Disputes ─────────────────────────────────────────────────────────

  async adminGetDisputes(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const res = await this.http.get<ApiResponse<any[]>>(`/admin/disputes?${params}`);
    return res.data.data;
  }

  async adminGetDispute(id: string) {
    const res = await this.http.get<ApiResponse<any>>(`/admin/disputes/${id}`);
    return res.data.data;
  }

  async adminResolveDispute(id: string, resolutionNote: string) {
    const res = await this.http.post<ApiResponse<any>>(`/admin/disputes/${id}/resolve`, {
      resolutionNote,
    });
    return res.data.data;
  }

  async adminEscalateDispute(id: string) {
    const res = await this.http.post<ApiResponse<any>>(`/admin/disputes/${id}/escalate`);
    return res.data.data;
  }

  // ─── Admin — Audit Logs ───────────────────────────────────────────────────────

  async adminGetAuditLogs(page = 1, limit = 50, action?: string, outcome?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (action) params.set('action', action);
    if (outcome) params.set('outcome', outcome);
    const res = await this.http.get<PaginatedResponse<any>>(`/admin/audit-logs?${params}`);
    return res.data;
  }
}

export const apiClient = new HarakaApiClient();
