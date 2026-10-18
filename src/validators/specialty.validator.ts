import { z } from 'zod';

export const createSpecialtySchema = z.object({
  name: z.string().min(2, 'Specialty name is required'),
  description: z.string().optional().nullable(),
  iconKey: z.string().optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});

export const updateSpecialtySchema = createSpecialtySchema.partial();

export type CreateSpecialtyInput = z.infer<typeof createSpecialtySchema>;
export type UpdateSpecialtyInput = z.infer<typeof updateSpecialtySchema>;
