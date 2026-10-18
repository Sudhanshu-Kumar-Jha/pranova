import { client } from './client';

export interface PatientDocument {
  id: string;
  patientId: string;
  title: string;
  category: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'INSURANCE' | 'OTHER';
  fileUrl: string;
  mimeType: string;
  fileSize?: number | null;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentPayload {
  title: string;
  category?: string;
  documentType?: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'INSURANCE_POLICY' | 'VACCINATION_RECORD' | 'OTHER';
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  base64Data?: string;
  fileName?: string;
  notes?: string;
}

export async function listPatientDocuments(): Promise<PatientDocument[]> {
  const res = await client.get<{ data: PatientDocument[] }>('/app/documents');
  return res.data.data;
}

export async function uploadPatientDocument(payload: UploadDocumentPayload): Promise<PatientDocument> {
  const body = {
    ...payload,
    documentType: payload.documentType || (payload.category as any) || 'PRESCRIPTION',
    mimeType: payload.mimeType || 'application/pdf',
    fileUrl: payload.fileUrl || '',
  };
  const res = await client.post<{ data: PatientDocument }>('/app/documents', body);
  return res.data.data;
}

export async function deletePatientDocument(id: string): Promise<void> {
  await client.delete(`/app/documents/${id}`);
}
