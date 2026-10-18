import { z } from 'zod';
import { SampleCollectionType, LabBookingStatus } from '@prisma/client';

export const createTestSchema = z.object({
  name: z.string().min(2, 'Test name is required'),
  code: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sampleType: z.string().optional().nullable(),
  preparation: z.string().optional().nullable(),
  mrp: z.number().min(0, 'MRP is required'),
  sellingPrice: z.number().min(0, 'Selling price is required'),
  reportTimeHours: z.number().int().min(1).default(24).optional(),
  homeCollectionAvailable: z.boolean().default(true).optional(),
  providerId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});

export const updateTestSchema = createTestSchema.partial();

export const bookLabTestSchema = z.object({
  testId: z.string().uuid('A valid testId is required'),
  collectionType: z.nativeEnum(SampleCollectionType).default(SampleCollectionType.HOME_COLLECTION).optional(),
  scheduledDate: z.coerce.date({ errorMap: () => ({ message: 'scheduledDate must be a valid ISO date-time' }) }),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  phone: z.string().min(7, 'Contact phone is required'),
});

export const updateLabBookingStatusSchema = z.object({
  status: z.nativeEnum(LabBookingStatus, {
    errorMap: () => ({ message: 'Invalid lab booking status' }),
  }),
  reportUrl: z.string().url('reportUrl must be a valid URL').optional().nullable(),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type BookLabTestInput = z.infer<typeof bookLabTestSchema>;
export type UpdateLabBookingStatusInput = z.infer<typeof updateLabBookingStatusSchema>;
