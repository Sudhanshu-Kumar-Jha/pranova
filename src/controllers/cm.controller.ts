import { Request, Response, NextFunction } from 'express';
import { CmService } from '../services/cm.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

function requireUser(req: Request): string {
  const id = req.user?.id;
  if (!id) throw ApiError.unauthorized('Authentication required');
  return id;
}

export class CmController {
  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CmService.getProfile(requireUser(req));
      return ApiResponse.success(res, 'Care manager profile retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  static async listCases(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CmService.listCases(requireUser(req), req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Assigned cases retrieved',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCase(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CmService.getCase(requireUser(req), req.params.id as string);
      return ApiResponse.success(res, 'Case retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateCaseStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CmService.updateCaseStatus(requireUser(req), req.params.id as string, req.body);
      return ApiResponse.success(res, `Case status updated to ${result.status}`, result);
    } catch (error) {
      next(error);
    }
  }

  static async addCaseNote(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CmService.addCaseNote(requireUser(req), req.params.id as string, req.body);
      return ApiResponse.success(res, 'Field note added to case timeline', result);
    } catch (error) {
      next(error);
    }
  }

  static async setAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CmService.setAvailability(requireUser(req), req.body);
      return ApiResponse.success(res, 'Availability updated', result);
    } catch (error) {
      next(error);
    }
  }
}
