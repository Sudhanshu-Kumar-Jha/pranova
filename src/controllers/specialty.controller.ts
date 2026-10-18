import { Request, Response, NextFunction } from 'express';
import { SpecialtyService } from '../services/specialty.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class SpecialtyController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SpecialtyService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Specialties retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SpecialtyService.getById(req.params.id as string);
      return ApiResponse.success(res, 'Specialty retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SpecialtyService.create(req.body);
      return ApiResponse.created(res, 'Specialty created successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SpecialtyService.update(req.params.id as string, req.body);
      return ApiResponse.success(res, 'Specialty updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SpecialtyService.delete(req.params.id as string);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  // ----- Patient (mobile) catalog -----
  static async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SpecialtyService.list({ ...req.query, isActive: 'true' });
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Specialties retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }
}
