import { api } from './client';

export interface EmergencySosPayload {
  incidentLatitude?: number;
  incidentLongitude?: number;
  incidentAddress?: string;
  title?: string;
  description?: string;
}

export interface EmergencySosResult {
  caseId: string;
  caseNumber: string;
  priority: string;
  status: string;
  title: string;
  patientName: string;
  incidentAddress: string;
  timestamp: string;
}

export async function triggerEmergencySos(
  payload?: EmergencySosPayload
): Promise<EmergencySosResult> {
  const res = await api.post('/app/sos', payload || {});
  return res.data.data;
}
