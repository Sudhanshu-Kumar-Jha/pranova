import { z } from 'zod';
import { MedicineCategory } from '@prisma/client';

/**
 * A product image is either a hosted URL, an inline `data:` URL uploaded from
 * the console, or empty (meaning "no image"). An empty string has to pass, so
 * clearing the field in the admin form is a valid edit.
 */
const imageUrlSchema = z
  .string()
  .max(800_000, 'That image is too large. Upload a smaller file or paste a hosted URL.')
  .refine(
    (v) => v === '' || /^data:image\//i.test(v) || /^https?:\/\//i.test(v),
    'Enter an image URL starting with http(s)://, or upload a file.'
  )
  .optional()
  .nullable();

export const createMedicineSchema = z.object({
  name: z.string().min(2, 'Medicine name is required'),
  brand: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  category: z.nativeEnum(MedicineCategory).default(MedicineCategory.OTC).optional(),
  form: z.string().optional().nullable(),
  packSize: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  mrp: z.number().min(0, 'MRP is required'),
  sellingPrice: z.number().min(0, 'Selling price is required'),
  stock: z.number().int().min(0).default(0).optional(),
  requiresPrescription: z.boolean().default(false).optional(),
  imageUrl: imageUrlSchema,
  isActive: z.boolean().default(true).optional(),
});

export const updateMedicineSchema = createMedicineSchema.partial();

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
