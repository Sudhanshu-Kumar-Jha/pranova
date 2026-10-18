import { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/patient.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

import { ApiError } from '../utils/apiError.js';

export class PatientController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PatientService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Patients retrieved successfully',
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          perPage: result.perPage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const patient = await PatientService.getById(id);
      return ApiResponse.success(res, 'Patient retrieved successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  static async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) {
        throw ApiError.unauthorized('Authentication required');
      }
      const patient = await PatientService.getById(patientId);
      return ApiResponse.success(res, 'Patient profile retrieved successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  static async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) {
        throw ApiError.unauthorized('Authentication required');
      }
      const patient = await PatientService.update(patientId, req.body);
      return ApiResponse.success(res, 'Profile updated successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await PatientService.create(req.body);
      return ApiResponse.created(res, 'Patient created successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const patient = await PatientService.update(id, req.body);
      return ApiResponse.success(res, 'Patient updated successfully', patient);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await PatientService.delete(id);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }
}
