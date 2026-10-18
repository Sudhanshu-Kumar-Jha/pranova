import { api, unwrap } from './client';

export type AppointmentType = 'VIDEO' | 'AUDIO' | 'IN_CLINIC';
export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  doctorId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  reason?: string | null;
  symptoms?: string | null;
  fee: number;
  paymentStatus: string;
  videoRoomId?: string | null;
  videoJoinUrl?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string | null;
    specialty?: { name: string } | null;
  };
}

export interface BookAppointmentPayload {
  doctorId: string;
  type: AppointmentType;
  scheduledStart: string; // ISO string
  durationMinutes?: number;
  reason?: string;
  symptoms?: string;
}

export interface VideoTokenResponse {
  appointmentId: string;
  roomId: string;
  joinUrl?: string | null;
  token: string;
  expiresInSeconds: number;
  provider: string;
}

export async function listMyAppointments(params?: {
  status?: string;
  type?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: Appointment[]; total: number }> {
  const res = await api.get('/app/appointments', { params });
  return { data: res.data.data as Appointment[], total: res.data.meta?.total ?? 0 };
}

export async function getAppointment(id: string): Promise<Appointment> {
  const { data } = unwrap<Appointment>(await api.get(`/app/appointments/${id}`));
  return data;
}

export async function bookAppointment(payload: BookAppointmentPayload): Promise<Appointment> {
  const { data } = unwrap<Appointment>(await api.post('/app/appointments', payload));
  return data;
}

export async function cancelAppointment(id: string, cancelReason: string): Promise<Appointment> {
  const { data } = unwrap<Appointment>(
    await api.post(`/app/appointments/${id}/cancel`, { cancelReason })
  );
  return data;
}

export async function getVideoToken(id: string): Promise<VideoTokenResponse> {
  const { data } = unwrap<VideoTokenResponse>(await api.post(`/app/appointments/${id}/video-token`));
  return data;
}
