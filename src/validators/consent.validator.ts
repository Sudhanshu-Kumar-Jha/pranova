import { z } from 'zod';

export const grantConsentSchema = z.object({
  careManagerId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  purpose: z.string().min(3, 'Clinical purpose is required').max(300),
  scope: z.string().max(200).default('ALL_CLINICAL_RECORDS'),
  durationHours: z.number().int().min(1).max(720).default(24), // default 24 hours
});

export const revokeConsentSchema = z.object({
  reason: z.string().max(300).optional(),
});

export type GrantConsentInput = z.infer<typeof grantConsentSchema>;
export type RevokeConsentInput = z.infer<typeof revokeConsentSchema>;
