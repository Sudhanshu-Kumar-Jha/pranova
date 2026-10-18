import { client } from './client';

export interface PatientConsent {
  id: string;
  patientId: string;
  careManagerId?: string | null;
  providerId?: string | null;
  purpose: string;
  scope: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
  careManager?: {
    id: string;
    phone: string;
    careManagerProfile?: {
      firstName: string;
      lastName: string;
      employeeCode?: string;
    };
  } | null;
}

export interface GrantConsentPayload {
  purpose: string;
  careManagerId?: string;
  providerId?: string;
  scope?: string;
  durationHours?: number;
}

export async function listPatientConsents(): Promise<PatientConsent[]> {
  const res = await client.get<{ data: PatientConsent[] }>('/app/consents');
  return res.data.data;
}

export async function grantPatientConsent(payload: GrantConsentPayload): Promise<PatientConsent> {
  const res = await client.post<{ data: PatientConsent }>('/app/consents', payload);
  return res.data.data;
}

export async function revokePatientConsent(id: string, reason?: string): Promise<PatientConsent> {
  const res = await client.patch<{ data: PatientConsent }>(`/app/consents/${id}/revoke`, { reason: reason || 'Patient revoked access' });
  return res.data.data;
}
