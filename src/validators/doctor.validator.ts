import { z } from 'zod';
import { DoctorStatus, AppointmentType } from '@prisma/client';

export const createDoctorSchema = z.object({
  specialtyId: z.string().uuid('A valid specialtyId is required'),
  providerId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  qualifications: z.string().optional().nullable(),
  experienceYears: z.number().int().min(0).default(0).optional(),
  bio: z.string().optional().nullable(),
  languages: z.string().optional().nullable(),
  consultationFeeVideo: z.number().min(0).default(0).optional(),
  consultationFeeAudio: z.number().min(0).default(0).optional(),
  consultationFeeClinic: z.number().min(0).default(0).optional(),
  city: z.string().optional().nullable(),
  clinicAddress: z.string().optional().nullable(),
  photoUrl: z.string().url('photoUrl must be a valid URL').optional().nullable(),
  isVideoEnabled: z.boolean().default(true).optional(),
  isAudioEnabled: z.boolean().default(true).optional(),
  status: z.nativeEnum(DoctorStatus).default(DoctorStatus.ACTIVE).optional(),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const updateDoctorStatusSchema = z.object({
  status: z.nativeEnum(DoctorStatus, {
    errorMap: () => ({ message: 'Status must be ACTIVE, INACTIVE, or ON_LEAVE' }),
  }),
});

export const createSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:mm (24h)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'endTime must be HH:mm (24h)'),
  type: z.nativeEnum(AppointmentType).default(AppointmentType.VIDEO).optional(),
  isActive: z.boolean().default(true).optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type UpdateDoctorStatusInput = z.infer<typeof updateDoctorStatusSchema>;
export type CreateSlotInput = z.infer<typeof createSlotSchema>;
