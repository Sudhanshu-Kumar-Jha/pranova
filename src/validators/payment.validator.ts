import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  caseId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('INR'),
  notes: z.string().optional(),
});

export const mockCheckoutSchema = z.object({
  gatewayOrderId: z.string().min(1, 'Gateway Order ID is required'),
  paymentMethod: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET']).default('UPI'),
  failSimulate: z.boolean().optional(),
});

export const completeAwaitingPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  notes: z.string().max(500).optional(),
});

export const paymentWebhookSchema = z.object({
  event: z.string().default('payment.captured'),
  gatewayOrderId: z.string(),
  transactionId: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(['SUCCESS', 'FAILED']).default('SUCCESS'),
});

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type MockCheckoutInput = z.infer<typeof mockCheckoutSchema>;
export type CompleteAwaitingPaymentInput = z.infer<typeof completeAwaitingPaymentSchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
