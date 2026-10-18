import { z } from 'zod';
import { AppointmentType, AppointmentStatus } from '@prisma/client';

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid('A valid doctorId is required'),
  type: z.nativeEnum(AppointmentType).default(AppointmentType.VIDEO).optional(),
  scheduledStart: z.coerce.date({ errorMap: () => ({ message: 'scheduledStart must be a valid ISO date-time' }) }),
  durationMinutes: z.number().int().min(10).max(120).default(30).optional(),
  reason: z.string().optional().nullable(),
  symptoms: z.string().optional().nullable(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, {
    errorMap: () => ({ message: 'Invalid appointment status' }),
  }),
  prescriptionNote: z.string().optional().nullable(),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().min(2, 'A cancellation reason is required'),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
