import { Request, Response, NextFunction } from 'express';
import { MedicineService } from '../services/medicine.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class MedicineController {
  // ----- Admin (web) management -----
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MedicineService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Medicines retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MedicineService.getById(req.params.id as string);
      return ApiResponse.success(res, 'Medicine retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MedicineService.create(req.body);
      return ApiResponse.created(res, 'Medicine added to catalog successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MedicineService.update(req.params.id as string, req.body);
      return ApiResponse.success(res, 'Medicine updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MedicineService.delete(req.params.id as string);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  // ----- Patient (mobile) catalog -----
  static async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MedicineService.list(req.query, true);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Pharmacy catalog retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }
}
