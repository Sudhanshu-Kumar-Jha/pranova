import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export const createAdminSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.string().optional().nullable(),
});

export const updateAdminStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, {
    errorMap: () => ({ message: 'Status must be ACTIVE, INACTIVE, or SUSPENDED' }),
  }),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminStatusInput = z.infer<typeof updateAdminStatusSchema>;
