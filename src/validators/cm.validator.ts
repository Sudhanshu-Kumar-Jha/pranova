import { z } from 'zod';
import { CaseStatus } from '@prisma/client';

export const cmUpdateCaseStatusSchema = z.object({
  status: z.nativeEnum(CaseStatus, {
    errorMap: () => ({ message: 'Invalid case status' }),
  }),
  notes: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const cmAvailabilitySchema = z.object({
  isAvailable: z.boolean().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const cmAddCaseNoteSchema = z.object({
  notes: z.string().min(1, 'Notes cannot be empty'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export type CmUpdateCaseStatusInput = z.infer<typeof cmUpdateCaseStatusSchema>;
export type CmAddCaseNoteInput = z.infer<typeof cmAddCaseNoteSchema>;
export type CmAvailabilityInput = z.infer<typeof cmAvailabilitySchema>;
