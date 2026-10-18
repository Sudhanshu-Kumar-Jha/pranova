import { api, unwrap } from './client';

export type LabBookingStatus =
  | 'BOOKED'
  | 'SAMPLE_COLLECTED'
  | 'PROCESSING'
  | 'REPORT_READY'
  | 'CANCELLED';

export type SampleCollectionType = 'HOME_COLLECTION' | 'LAB_VISIT';

export interface DiagnosticTest {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string | null;
  sampleType: string;
  preparation?: string | null;
  mrp: number;
  sellingPrice: number;
  homeCollectionAvailable: boolean;
  reportTimeHours: number;
  isActive: boolean;
}

export interface LabBooking {
  id: string;
  bookingNumber: string;
  patientId: string;
  testId: string;
  status: LabBookingStatus;
  collectionType: SampleCollectionType;
  scheduledDate: string;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  phone: string;
  amount: number;
  paymentStatus: string;
  reportUrl?: string | null;
  createdAt: string;
  test?: {
    id: string;
    name: string;
    category: string;
    reportTimeHours: number;
  };
}

export interface BookLabTestPayload {
  testId: string;
  collectionType: SampleCollectionType;
  scheduledDate: string; // ISO string
  address?: string;
  city?: string;
  pincode?: string;
  phone: string;
}

export async function listLabTests(params?: {
  q?: string;
  category?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: DiagnosticTest[]; total: number }> {
  const res = await api.get('/app/lab-tests', { params });
  return { data: res.data.data as DiagnosticTest[], total: res.data.meta?.total ?? 0 };
}

export async function listMyLabBookings(params?: {
  status?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: LabBooking[]; total: number }> {
  const res = await api.get('/app/lab-bookings', { params });
  return { data: res.data.data as LabBooking[], total: res.data.meta?.total ?? 0 };
}

export async function getLabBooking(id: string): Promise<LabBooking> {
  const { data } = unwrap<LabBooking>(await api.get(`/app/lab-bookings/${id}`));
  return data;
}

export async function bookLabTest(payload: BookLabTestPayload): Promise<LabBooking> {
  const { data } = unwrap<LabBooking>(await api.post('/app/lab-bookings', payload));
  return data;
}
