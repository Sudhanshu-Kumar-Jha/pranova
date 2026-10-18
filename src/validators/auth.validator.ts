import { z } from 'zod';
import { Role } from '@prisma/client';

export const adminLoginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const adminRegisterSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.string().optional(),
});

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(
      z
        .string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number must not exceed 15 digits')
        .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 or 10-digit format)')
    ),
  role: z.enum([Role.PATIENT, Role.CARE_MANAGER], {
    errorMap: () => ({ message: 'Role must be either PATIENT or CARE_MANAGER' }),
  }),
  purpose: z.enum(['LOGIN', 'REGISTER']).optional().default('LOGIN'),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(
      z
        .string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(15, 'Phone number must not exceed 15 digits')
    ),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  role: z.enum([Role.PATIENT, Role.CARE_MANAGER], {
    errorMap: () => ({ message: 'Role must be either PATIENT or CARE_MANAGER' }),
  }),
  purpose: z.enum(['LOGIN', 'REGISTER']).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email('Please provide a valid email address').optional().nullable(),
  primaryAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
