import { client } from './client';

export interface CasePayment {
  id: string;
  caseId: string;
  patientId: string;
  amount: number;
  currency: string;
  gateway: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  orderId?: string | null;
  transactionId?: string | null;
  metadata?: any;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockCheckoutResult {
  payment: CasePayment;
  case: any;
  message: string;
}

export async function getCasePayment(caseId: string): Promise<CasePayment | null> {
  const res = await client.get<{ data: CasePayment | null }>(`/app/cases/${caseId}/payment`);
  return res.data.data;
}

export async function createPaymentOrder(caseId: string, amount: number, currency: string = 'INR'): Promise<CasePayment> {
  const res = await client.post<{ data: CasePayment }>('/app/payments/create-order', {
    caseId,
    amount,
    currency,
  });
  return res.data.data;
}

export async function mockCheckout(gatewayOrderId: string, paymentMethod: string = 'UPI', failSimulate: boolean = false): Promise<MockCheckoutResult> {
  const res = await client.post<{ data: MockCheckoutResult }>('/app/payments/mock-checkout', {
    gatewayOrderId,
    paymentMethod,
    failSimulate,
  });
  return res.data.data;
}
