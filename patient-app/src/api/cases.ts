import { client } from './client';

export interface PatientCase {
  id: string;
  caseNumber: string;
  title: string;
  description?: string | null;
  priority: 'P1' | 'P2' | 'P3';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED_AWAITING_PAYMENT' | 'PAID' | 'RESOLVED' | 'CANCELLED';
  triggerSource: string;
  careManagerId?: string | null;
  careManagerName?: string | null;
  careManagerPhone?: string | null;
  providerName?: string | null;
  incidentAddress?: string | null;
  paymentStatus?: string | null;
  paymentAmount?: number | null;
  paymentTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listMyCases(): Promise<PatientCase[]> {
  const res = await client.get<{ data: PatientCase[] }>('/app/cases');
  return res.data.data;
}

export async function getMyCase(id: string): Promise<PatientCase> {
  const res = await client.get<{ data: PatientCase }>(`/app/cases/${id}`);
  return res.data.data;
}
