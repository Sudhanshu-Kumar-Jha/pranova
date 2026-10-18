import { api, unwrap } from './client';

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string | null;
  role: string;
  isActive?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** `GET /auth/me` returns the user plus their role-specific profile. */
export interface MeResponse {
  id: string;
  phone?: string;
  email?: string | null;
  role: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    employeeCode?: string | null;
    specialization?: string | null;
    assignedZone?: string | null;
    isAvailable?: boolean;
  } | null;
}

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/auth/otp/send', { phone, role: 'CARE_MANAGER' });
}

export async function verifyOtp(
  phone: string,
  otp: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const { data } = unwrap<{ user: AuthUser; tokens: AuthTokens }>(
    await api.post('/auth/otp/verify', { phone, otp, role: 'CARE_MANAGER' })
  );
  return data;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = unwrap<MeResponse>(await api.get('/auth/me'));
  return data;
}
