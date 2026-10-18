import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AdminController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Administrators retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getById(req.params.id as string);
      return ApiResponse.success(res, 'Administrator retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.create(req.body);
      return ApiResponse.created(res, 'Administrator created successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.updateStatus(req.params.id as string, req.body, req.user?.id);
      return ApiResponse.success(res, `Administrator status changed to ${result.status}`, result);
    } catch (error) {
      next(error);
    }
  }
}
