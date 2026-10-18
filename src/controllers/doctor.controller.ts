import { Request, Response, NextFunction } from 'express';
import { DoctorService } from '../services/doctor.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class DoctorController {
  // ----- Admin (web) management -----
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Doctors retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.getById(req.params.id as string);
      return ApiResponse.success(res, 'Doctor retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.create(req.body);
      return ApiResponse.created(res, 'Doctor onboarded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.update(req.params.id as string, req.body);
      return ApiResponse.success(res, 'Doctor updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.updateStatus(req.params.id as string, req.body);
      return ApiResponse.success(res, `Doctor status changed to ${result.status}`, result);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.delete(req.params.id as string);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  static async addSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.addSlot(req.params.id as string, req.body);
      return ApiResponse.created(res, 'Availability slot added', result);
    } catch (error) {
      next(error);
    }
  }

  static async removeSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.removeSlot(req.params.id as string, req.params.slotId as string);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  // ----- Patient (mobile) catalog -----
  static async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.list(req.query, true);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Doctor directory retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DoctorService.getById(req.params.id as string);
      return ApiResponse.success(res, 'Doctor profile retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}
