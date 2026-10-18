import { api } from './client';

export interface AuthUser {
  id: string;
  phone?: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PatientProfileDetails {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  primaryAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CurrentUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  profile?: PatientProfileDetails | null;
  createdAt: string;
}

export interface PatientRegisterPayload {
  phone: string;
  otp: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  primaryAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  gender?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  primaryAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export async function sendOtp(phone: string, purpose: 'LOGIN' | 'REGISTER' = 'LOGIN'): Promise<void> {
  await api.post('/auth/otp/send', { phone, role: 'PATIENT', purpose });
}

export async function verifyOtp(
  phoneOrPayload: string | PatientRegisterPayload,
  otp?: string,
  firstName?: string,
  lastName?: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  let body: Record<string, unknown>;
  if (typeof phoneOrPayload === 'string') {
    body = { phone: phoneOrPayload, otp, role: 'PATIENT', purpose: 'LOGIN', firstName, lastName };
  } else {
    body = { ...phoneOrPayload, role: 'PATIENT', purpose: 'REGISTER' };
  }
  const res = await api.post('/auth/otp/verify', body);
  return res.data.data;
}

export async function getMe(): Promise<CurrentUser> {
  const res = await api.get('/auth/me');
  return res.data.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<any> {
  const res = await api.patch('/app/profile', payload);
  return res.data.data;
}

export async function getPatientProfile(): Promise<any> {
  const res = await api.get('/app/profile');
  return res.data.data;
}
