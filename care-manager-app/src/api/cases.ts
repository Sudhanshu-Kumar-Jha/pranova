import { api, unwrap } from './client';

/** The statuses the backend accepts; RESOLVED and CANCELLED are terminal. */
export type CaseStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED_AWAITING_PAYMENT'
  | 'PAID'
  | 'RESOLVED'
  | 'CANCELLED';
export type CasePriority = 'P1' | 'P2' | 'P3';
export type CaseTriggerSource = 'SOS_BUTTON' | 'PATIENT_REQUEST' | 'ADMIN_MANUAL' | 'CARE_MANAGER';

export interface CmProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeCode?: string | null;
  specialization?: string | null;
  licenseNumber?: string | null;
  isAvailable: boolean;
  assignedZone?: string | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  lastLocationUpdate?: string | null;
  activeCases: number;
}

export interface CasePatient {
  id: string;
  phone?: string | null;
  patientProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    bloodGroup?: string | null;
    primaryAddress?: string | null;
  } | null;
}

export interface CaseProvider {
  id: string;
  name: string;
  type?: string | null;
  city?: string | null;
  phone?: string | null;
}

export interface CaseRow {
  id: string;
  caseNumber: string;
  title: string;
  description?: string | null;
  priority: CasePriority;
  status: CaseStatus;
  triggerSource?: CaseTriggerSource;
  incidentAddress?: string | null;
  incidentLatitude?: number | null;
  incidentLongitude?: number | null;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  patient?: CasePatient | null;
  provider?: CaseProvider | null;
}

export interface CaseTimelineEntry {
  id: string;
  caseId: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  oldStatus?: CaseStatus | null;
  newStatus?: CaseStatus | null;
  notes?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  createdAt: string;
}

/** `GET /cm/cases/:id` — the row plus its append-only timeline, newest first. */
export interface CaseDetail extends CaseRow {
  timeline: CaseTimelineEntry[];
}

export interface StatusUpdateInput {
  status: CaseStatus;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export async function getProfile(): Promise<CmProfile> {
  const { data } = unwrap<CmProfile>(await api.get('/cm/me'));
  return data;
}

export async function listCases(params?: {
  status?: CaseStatus;
  page?: number;
  perPage?: number;
}): Promise<{ data: CaseRow[]; total: number }> {
  const { data, meta } = unwrap<CaseRow[]>(await api.get('/cm/cases', { params }));
  return { data: data ?? [], total: meta?.total ?? 0 };
}

export async function getCase(id: string): Promise<CaseDetail> {
  const { data } = unwrap<CaseDetail>(await api.get(`/cm/cases/${id}`));
  return data;
}

/**
 * Transitions are server-authoritative: the requested status is sent as-is and
 * the returned case is rendered. The client never mirrors the transition table.
 */
export async function updateCaseStatus(id: string, input: StatusUpdateInput): Promise<CaseRow> {
  const { data } = unwrap<CaseRow>(await api.patch(`/cm/cases/${id}/status`, input));
  return data;
}

export async function addCaseNote(
  id: string,
  input: { notes: string; latitude?: number; longitude?: number }
): Promise<CaseDetail> {
  const { data } = unwrap<CaseDetail>(await api.post(`/cm/cases/${id}/notes`, input));
  return data;
}

export async function setAvailability(input: {
  isAvailable?: boolean;
  latitude?: number;
  longitude?: number;
}): Promise<CmProfile> {
  const { data } = unwrap<CmProfile>(await api.patch('/cm/availability', input));
  return data;
}

/** Display name for the patient on a case, or null when the profile is absent. */
export function patientName(c?: Pick<CaseRow, 'patient'> | null): string | null {
  const p = c?.patient?.patientProfile;
  if (!p) return null;
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  return name.length > 0 ? name : null;
}

export async function completeAwaitingPayment(
  caseId: string,
  input: { amount: number; notes?: string }
): Promise<any> {
  const { data } = unwrap<any>(await api.post(`/cm/cases/${caseId}/awaiting-payment`, input));
  return data;
}

export async function checkPatientConsent(
  patientId: string
): Promise<{ hasConsent: boolean; consentId?: string; expiresAt?: string; purpose?: string }> {
  const { data } = unwrap<any>(await api.get(`/cm/consents/check/${patientId}`));
  return data;
}

export async function getPatientDocuments(
  patientId: string
): Promise<Array<{ id: string; title: string; category: string; fileUrl: string; createdAt: string }>> {
  const { data } = unwrap<any>(await api.get(`/cm/patients/${patientId}/documents`));
  return data;
}


/**
 * The patient's live position for one of my active cases.
 *
 * The server gates this on three things: the case is assigned to me, the case
 * is still active, and the patient's consent (opened automatically when the
 * case was raised) is unexpired. A refusal is a normal outcome here, so the
 * caller renders the server's message rather than treating it as a crash.
 */
export interface PatientLocationView {
  caseId: string;
  caseNumber: string;
  patientId: string;
  patientName: string | null;
  available: boolean;
  reason?: string;
  latitude?: number;
  longitude?: number;
  updatedAt?: string;
  ageMinutes?: number;
  freshness?: 'LIVE' | 'STALE';
  registeredAddress?: string | null;
  sharingExpiresAt?: string | null;
}

export async function getPatientLocation(caseId: string): Promise<PatientLocationView> {
  const { data } = unwrap<PatientLocationView>(
    await api.get(`/cm/cases/${caseId}/patient-location`)
  );
  return data;
}
