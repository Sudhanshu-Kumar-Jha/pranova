import { CaseStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { getIO } from '../socket/index.js';
import {
  CreatePaymentOrderInput,
  MockCheckoutInput,
  CompleteAwaitingPaymentInput,
  PaymentWebhookInput,
} from '../validators/payment.validator.js';

export class PaymentService {
  /**
   * Care Manager completes case triage and marks it as COMPLETED_AWAITING_PAYMENT
   */
  static async completeCaseAwaitingPayment(
    caseId: string,
    cmUserId: string,
    input: CompleteAwaitingPaymentInput
  ) {
    const targetCase = await prisma.case.findFirst({
      where: { id: caseId, careManagerId: cmUserId },
    });

    if (!targetCase) {
      throw ApiError.notFound('Case not found or not assigned to you');
    }

    if (targetCase.status === CaseStatus.RESOLVED || targetCase.status === CaseStatus.CANCELLED) {
      throw ApiError.badRequest(`Cannot bill case that is already ${targetCase.status}`);
    }

    const receiptNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { updatedCase, payment } = await prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({
        where: { id: caseId },
        data: {
          status: CaseStatus.COMPLETED_AWAITING_PAYMENT,
        },
      });

      const newPayment = await tx.payment.create({
        data: {
          caseId,
          patientId: targetCase.patientId,
          amount: input.amount,
          currency: 'INR',
          status: PaymentStatus.PENDING,
          gateway: 'MOCK_RAZORPAY',
          receiptNumber,
          notes: input.notes || 'Healthcare coordination and clinical care service fee',
        },
      });

      await tx.caseTimeline.create({
        data: {
          caseId,
          actorId: cmUserId,
          actorRole: Role.CARE_MANAGER,
          action: 'STATUS_CHANGED_TO_COMPLETED_AWAITING_PAYMENT',
          oldStatus: targetCase.status,
          newStatus: CaseStatus.COMPLETED_AWAITING_PAYMENT,
          notes: `Care Manager completed field service. Invoice generated for ₹${input.amount}. Awaiting patient payment.`,
        },
      });

      return { updatedCase: updated, payment: newPayment };
    });

    // Real-time notification to Patient and Admin room
    try {
      const io = getIO();
      const payload = {
        caseId,
        caseNumber: targetCase.caseNumber,
        status: CaseStatus.COMPLETED_AWAITING_PAYMENT,
        amount: input.amount,
        notes: input.notes,
        updatedAt: new Date().toISOString(),
      };
      io.to(`patient_${targetCase.patientId}`).emit('case:status_changed', payload);
      io.to('admin_room').emit('case:status_changed', payload);
      console.log(`[SOCKET] Case ${targetCase.caseNumber} -> COMPLETED_AWAITING_PAYMENT. Alerted patient_${targetCase.patientId}`);
    } catch (err: any) {
      console.warn(`[SOCKET] Could not emit payment status update: ${err.message}`);
    }

    return { case: updatedCase, payment };
  }

  /**
   * Patient creates a payment order (Mock Razorpay / Stripe Order)
   */
  static async createOrder(patientId: string, input: CreatePaymentOrderInput) {
    const targetCase = await prisma.case.findFirst({
      where: { id: input.caseId, patientId },
    });

    if (!targetCase) {
      throw ApiError.notFound('Case not found or does not belong to you');
    }

    // Check if an existing payment order exists
    let payment = await prisma.payment.findFirst({
      where: { caseId: input.caseId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    const gatewayOrderId = `order_mock_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          caseId: input.caseId,
          patientId,
          amount: input.amount,
          currency: input.currency || 'INR',
          status: PaymentStatus.PENDING,
          gateway: 'MOCK_RAZORPAY',
          gatewayOrderId,
          notes: input.notes || 'Patient initiated digital payment checkout',
        },
      });
    } else {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          amount: input.amount,
          gatewayOrderId,
        },
      });
    }

    return {
      orderId: gatewayOrderId,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      caseId: input.caseId,
      caseNumber: targetCase.caseNumber,
      key: 'rzp_mock_live_pranova_healthcare_2026',
    };
  }

  /**
   * Patient executes mock checkout (Simulating successful Razorpay / Stripe payment)
   */
  static async mockCheckout(patientId: string, input: MockCheckoutInput) {
    const payment = await prisma.payment.findFirst({
      where: {
        gatewayOrderId: input.gatewayOrderId,
        patientId,
      },
      include: {
        case: true,
      },
    });

    if (!payment) {
      throw ApiError.notFound('Payment order not found for this user');
    }

    if (payment.status === PaymentStatus.PAID) {
      return {
        success: true,
        message: 'Payment has already been processed successfully',
        payment,
      };
    }

    if (input.failSimulate) {
      const failedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
      return {
        success: false,
        message: 'Payment declined by issuing bank (Simulated Failure)',
        payment: failedPayment,
      };
    }

    const transactionId = `txn_mock_${Date.now()}_${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptNumber = payment.receiptNumber || `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const paidAt = new Date();

    const { updatedPayment, updatedCase } = await prisma.$transaction(async (tx) => {
      const paid = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          transactionId,
          receiptNumber,
          paymentMethod: input.paymentMethod || 'UPI',
          paidAt,
        },
      });

      let updatedCaseRecord = null;
      if (payment.caseId) {
        updatedCaseRecord = await tx.case.update({
          where: { id: payment.caseId },
          data: {
            status: CaseStatus.PAID,
            resolvedAt: paidAt,
          },
        });

        await tx.caseTimeline.create({
          data: {
            caseId: payment.caseId,
            actorId: patientId,
            actorRole: Role.PATIENT,
            action: 'STATUS_CHANGED_TO_PAID',
            oldStatus: payment.case?.status || CaseStatus.COMPLETED_AWAITING_PAYMENT,
            newStatus: CaseStatus.PAID,
            notes: `Payment of ₹${payment.amount} received via ${input.paymentMethod}. Txn ID: ${transactionId}. Case settled.`,
          },
        });
      }

      return { updatedPayment: paid, updatedCase: updatedCaseRecord };
    });

    // Real-time socket notification of payment success
    try {
      const io = getIO();
      const statusPayload = {
        caseId: payment.caseId,
        caseNumber: payment.case?.caseNumber,
        status: CaseStatus.PAID,
        amount: updatedPayment.amount,
        transactionId,
        receiptNumber,
        paidAt: paidAt.toISOString(),
      };
      io.to(`patient_${patientId}`).emit('case:status_changed', statusPayload);
      io.to('admin_room').emit('case:status_changed', statusPayload);
      console.log(`[SOCKET] Case ${payment.case?.caseNumber} settled with status PAID. Txn: ${transactionId}`);
    } catch (err: any) {
      console.warn(`[SOCKET] Could not emit payment success event: ${err.message}`);
    }

    return {
      success: true,
      message: 'Payment completed successfully',
      payment: updatedPayment,
      case: updatedCase,
    };
  }

  /**
   * Public Webhook endpoint for Payment Gateways (Razorpay / Stripe)
   */
  static async handleWebhook(payload: PaymentWebhookInput) {
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: payload.gatewayOrderId },
      include: { case: true },
    });

    if (!payment) {
      throw ApiError.notFound('Payment matching gatewayOrderId not found');
    }

    if (payload.status === 'SUCCESS' && payment.status !== PaymentStatus.PAID) {
      const transactionId = payload.transactionId || `txn_wh_${Date.now()}`;
      const paidAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            transactionId,
            paidAt,
          },
        });

        if (payment.caseId) {
          await tx.case.update({
            where: { id: payment.caseId },
            data: {
              status: CaseStatus.PAID,
              resolvedAt: paidAt,
            },
          });

          await tx.caseTimeline.create({
            data: {
              caseId: payment.caseId,
              action: 'WEBHOOK_PAYMENT_VERIFIED',
              oldStatus: payment.case?.status,
              newStatus: CaseStatus.PAID,
              notes: `Gateway webhook confirmed payment of ₹${payment.amount}. Txn: ${transactionId}`,
            },
          });
        }
      });

      // Real-time notification
      try {
        const io = getIO();
        const eventData = {
          caseId: payment.caseId,
          caseNumber: payment.case?.caseNumber,
          status: CaseStatus.PAID,
          amount: payment.amount,
          transactionId,
          updatedAt: paidAt.toISOString(),
        };
        io.to(`patient_${payment.patientId}`).emit('case:status_changed', eventData);
        io.to('admin_room').emit('case:status_changed', eventData);
      } catch (err: any) {
        console.warn(`[SOCKET] Webhook socket emit failed: ${err.message}`);
      }
    }

    return { received: true, gatewayOrderId: payload.gatewayOrderId };
  }

  /**
   * Get payment & billing details for a specific Case
   */
  static async getCasePayment(caseId: string) {
    const payment = await prisma.payment.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            phone: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return payment;
  }
}
