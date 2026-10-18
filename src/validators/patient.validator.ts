import { z } from 'zod';

export const createPatientSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits'),
  email: z.string().email('Invalid email address').optional().nullable(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().datetime().optional().nullable().or(z.string().optional()),
  gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  primaryAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  medicalHistory: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();

/**
 * Live device position pushed by the patient app (`PATCH /app/location`).
 *
 * This is telemetry, not the registered address: it updates
 * `currentLatitude` / `currentLongitude` / `lastLocationUpdate` and never
 * touches `primaryAddress` or the delivery coordinates. Coordinates are
 * range-checked so a malformed sensor reading cannot land a dispatch pin in
 * the ocean.
 */
export const updateMyLocationSchema = z.object({
  latitude: z.number().min(-90, 'Latitude out of range').max(90, 'Latitude out of range'),
  longitude: z.number().min(-180, 'Longitude out of range').max(180, 'Longitude out of range'),
  accuracy: z.number().nonnegative().optional().nullable(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type UpdateMyLocationInput = z.infer<typeof updateMyLocationSchema>;
