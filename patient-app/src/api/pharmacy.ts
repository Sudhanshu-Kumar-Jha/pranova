import { api, unwrap } from './client';

export type MedicineCategory = 'OTC' | 'PRESCRIPTION' | 'WELLNESS' | 'DEVICE';
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Medicine {
  id: string;
  name: string;
  brand: string;
  manufacturer?: string | null;
  category: MedicineCategory;
  form: string;
  packSize: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  requiresPrescription: boolean;
  imageUrl?: string | null;
  isActive: boolean;
}

export type PaymentMethod = 'COD' | 'ONLINE';

export interface OrderItem {
  id: string;
  medicineId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  medicine?: {
    id: string;
    name: string;
    brand: string;
    imageUrl?: string | null;
  };
}

export interface MedicineOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  deliveryAddress: string;
  city?: string | null;
  pincode?: string | null;
  phone: string;
  notes?: string | null;
  placedAt: string;
  deliveredAt?: string | null;
  items: OrderItem[];
}

export interface PlaceOrderPayload {
  items: Array<{ medicineId: string; quantity: number }>;
  deliveryAddress: string;
  city?: string;
  pincode?: string;
  phone: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export async function listMedicines(params?: {
  q?: string;
  category?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: Medicine[]; total: number }> {
  const res = await api.get('/app/medicines', { params });
  return { data: res.data.data as Medicine[], total: res.data.meta?.total ?? 0 };
}

export async function listMyOrders(params?: {
  status?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: MedicineOrder[]; total: number }> {
  const res = await api.get('/app/orders', { params });
  return { data: res.data.data as MedicineOrder[], total: res.data.meta?.total ?? 0 };
}

export async function getOrder(id: string): Promise<MedicineOrder> {
  const { data } = unwrap<MedicineOrder>(await api.get(`/app/orders/${id}`));
  return data;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<MedicineOrder> {
  const { data } = unwrap<MedicineOrder>(await api.post('/app/orders', payload));
  return data;
}
