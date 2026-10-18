import { OrderStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { generateReference } from '../utils/reference.js';
import { PlaceOrderInput, UpdateOrderStatusInput } from '../validators/order.validator.js';
import { OrderQueryFilter } from '../types/query.types.js';
import { getPagination, getSort } from '../utils/pagination.js';
import { SettingsService } from './settings.service.js';

const orderInclude = {
  items: { include: { medicine: { select: { id: true, name: true, brand: true, imageUrl: true } } } },
  patient: { select: { id: true, email: true, phone: true } },
} satisfies Prisma.MedicineOrderInclude;

/**
 * Allowed forward transitions for a pharmacy order's fulfilment lifecycle.
 */
const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  PACKED: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export class OrderService {
  static async list(query: OrderQueryFilter) {
    const { page, perPage, skip, take } = getPagination(query, 10);
    const { field: sort, order } = getSort(
      query,
      ['placedAt', 'totalAmount', 'createdAt', 'status'],
      'placedAt',
      'desc'
    );

    const where: Prisma.MedicineOrderWhereInput = {
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await prisma.medicineOrder.count({ where });
    const orders = await prisma.medicineOrder.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: orderInclude,
    });

    return { data: orders, total, page, perPage };
  }

  static async getById(id: string, patientId?: string) {
    const order = await prisma.medicineOrder.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw ApiError.notFound('Order not found');
    if (patientId && order.patientId !== patientId) {
      throw ApiError.forbidden('You can only access your own orders');
    }
    return order;
  }

  /**
   * Places an order for a patient: validates catalog items & stock, computes
   * pricing server-side (never trusts client totals), and decrements stock
   * atomically within a transaction.
   */
  static async place(patientId: string, input: PlaceOrderInput) {
    const medicineIds = input.items.map((i) => i.medicineId);
    const medicines = await prisma.medicine.findMany({ where: { id: { in: medicineIds } } });
    const byId = new Map(medicines.map((m) => [m.id, m]));

    let subtotal = 0;
    let discount = 0;
    const lineItems = input.items.map((item) => {
      const medicine = byId.get(item.medicineId);
      if (!medicine) throw ApiError.badRequest(`Medicine ${item.medicineId} was not found`);
      if (!medicine.isActive) throw ApiError.badRequest(`"${medicine.name}" is currently unavailable`);
      if (medicine.stock < item.quantity) {
        throw ApiError.badRequest(`Insufficient stock for "${medicine.name}" (available: ${medicine.stock})`);
      }
      const lineTotal = medicine.sellingPrice * item.quantity;
      subtotal += lineTotal;
      discount += Math.max(0, medicine.mrp - medicine.sellingPrice) * item.quantity;
      return {
        medicineId: medicine.id,
        quantity: item.quantity,
        unitPrice: medicine.sellingPrice,
        lineTotal,
      };
    });

    // Pricing rules are admin-configured (Settings), never sent by the client.
    const pricing = await SettingsService.getPharmacyConfig();

    if (pricing.minOrderAmount > 0 && subtotal < pricing.minOrderAmount) {
      throw ApiError.badRequest(
        `The minimum order value is ${pricing.minOrderAmount}. Add ${(pricing.minOrderAmount - subtotal).toFixed(2)} more to check out.`
      );
    }

    const paymentMethod = input.paymentMethod ?? PaymentMethod.COD;
    if (paymentMethod === PaymentMethod.COD && !pricing.codEnabled) {
      throw ApiError.badRequest('Cash on delivery is not available right now. Choose another payment method.');
    }
    if (paymentMethod === PaymentMethod.ONLINE && !pricing.onlinePaymentEnabled) {
      throw ApiError.badRequest('Online payment is not enabled yet. Please place the order as cash on delivery.');
    }

    const deliveryFee =
      subtotal >= pricing.freeDeliveryThreshold || subtotal === 0 ? 0 : pricing.deliveryFee;
    const totalAmount = subtotal + deliveryFee;

    return prisma.$transaction(async (tx) => {
      for (const li of lineItems) {
        await tx.medicine.update({ where: { id: li.medicineId }, data: { stock: { decrement: li.quantity } } });
      }
      return tx.medicineOrder.create({
        data: {
          orderNumber: generateReference('ORD'),
          patientId,
          status: OrderStatus.PLACED,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod,
          subtotal,
          deliveryFee,
          discount,
          totalAmount,
          deliveryAddress: input.deliveryAddress,
          city: input.city,
          pincode: input.pincode,
          phone: input.phone,
          prescriptionUrl: input.prescriptionUrl,
          notes: input.notes,
          items: { create: lineItems },
        },
        include: orderInclude,
      });
    });
  }

  static async updateStatus(id: string, input: UpdateOrderStatusInput) {
    const existing = await prisma.medicineOrder.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw ApiError.notFound('Order not found');

    const allowed = ORDER_FLOW[existing.status];
    if (!allowed.includes(input.status)) {
      throw ApiError.badRequest(`Cannot transition order from ${existing.status} to ${input.status}`);
    }

    return prisma.$transaction(async (tx) => {
      // Restock on cancellation
      if (input.status === OrderStatus.CANCELLED) {
        for (const item of existing.items) {
          await tx.medicine.update({ where: { id: item.medicineId }, data: { stock: { increment: item.quantity } } });
        }
      }
      return tx.medicineOrder.update({
        where: { id },
        data: {
          status: input.status,
          deliveredAt: input.status === OrderStatus.DELIVERED ? new Date() : undefined,
          paymentStatus: input.status === OrderStatus.DELIVERED ? PaymentStatus.PAID : undefined,
        },
        include: orderInclude,
      });
    });
  }

  static async listForPatient(patientId: string, query: OrderQueryFilter) {
    return this.list({ ...query, patientId });
  }
}
