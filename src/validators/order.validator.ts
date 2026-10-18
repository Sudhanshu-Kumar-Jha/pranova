import { z } from 'zod';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        medicineId: z.string().uuid('A valid medicineId is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'At least one item is required'),
  deliveryAddress: z.string().min(3, 'Delivery address is required'),
  city: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  phone: z.string().min(7, 'Contact phone is required'),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  prescriptionUrl: z.string().url('prescriptionUrl must be a valid URL').optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
