import { api, unwrap } from './client';

export interface DoctorSlot {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: 'VIDEO' | 'IN_CLINIC';
  isActive: boolean;
}

export interface Specialty {
  id: string;
  name: string;
  iconKey?: string | null;
  description?: string | null;
  doctorsCount?: number;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  gender?: string | null;
  registrationNumber?: string | null;
  qualifications?: string | null;
  experienceYears: number;
  bio?: string | null;
  languages?: string | null;
  consultationFeeVideo: number;
  consultationFeeAudio?: number;
  consultationFeeClinic: number;
  clinicAddress?: string | null;
  city?: string | null;
  rating: number;
  isVideoEnabled: boolean;
  isAudioEnabled?: boolean;
  status: string;
  specialty?: { id: string; name: string; iconKey?: string | null } | null;
  provider?: { id: string; name: string; type: string; city?: string | null } | null;
  slots?: DoctorSlot[];
}

export async function listSpecialties(): Promise<Specialty[]> {
  const { data } = unwrap<Specialty[]>(await api.get('/app/specialties'));
  return data;
}

export async function listDoctors(params?: {
  specialtyId?: string;
  city?: string;
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: Doctor[]; total: number }> {
  const res = await api.get('/app/doctors', { params });
  return { data: res.data.data as Doctor[], total: res.data.meta?.total ?? 0 };
}

export async function getDoctor(id: string): Promise<Doctor> {
  const { data } = unwrap<Doctor>(await api.get(`/app/doctors/${id}`));
  return data;
}
