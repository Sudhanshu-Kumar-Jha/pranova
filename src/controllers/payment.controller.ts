import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class PaymentController {
  static async completeAwaitingPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const cmId = req.user?.id;
      if (!cmId) throw ApiError.unauthorized('Care Manager authentication required');

      const result = await PaymentService.completeCaseAwaitingPayment(id, cmId, req.body);
      return ApiResponse.success(res, 'Case marked COMPLETED_AWAITING_PAYMENT and invoice created', result);
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const order = await PaymentService.createOrder(patientId, req.body);
      return ApiResponse.created(res, 'Mock payment order generated', order);
    } catch (error) {
      next(error);
    }
  }

  static async mockCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const result = await PaymentService.mockCheckout(patientId, req.body);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.handleWebhook(req.body);
      return res.status(200).json({ status: 'ok', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getCasePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const payment = await PaymentService.getCasePayment(id);
      return ApiResponse.success(res, 'Case billing details retrieved', payment);
    } catch (error) {
      next(error);
    }
  }
}
