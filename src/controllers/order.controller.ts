import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class OrderController {
  // ----- Admin (web) oversight -----
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Medicine orders retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.getById(req.params.id as string);
      return ApiResponse.success(res, 'Order retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OrderService.updateStatus(req.params.id as string, req.body);
      return ApiResponse.success(res, `Order status changed to ${result.status}`, result);
    } catch (error) {
      next(error);
    }
  }

  // ----- Patient (mobile) -----
  static async place(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await OrderService.place(patientId, req.body);
      return ApiResponse.created(res, 'Order placed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async myOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await OrderService.listForPatient(patientId, req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Your orders retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async myOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await OrderService.getById(req.params.id as string, patientId);
      return ApiResponse.success(res, 'Order retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}
