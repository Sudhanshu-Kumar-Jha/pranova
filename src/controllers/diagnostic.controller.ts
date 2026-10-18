import { Request, Response, NextFunction } from 'express';
import { DiagnosticService } from '../services/diagnostic.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class DiagnosticController {
  // ----- Admin (web): test catalog -----
  static async listTests(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.listTests(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Diagnostic tests retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTestById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.getTestById(req.params.id as string);
      return ApiResponse.success(res, 'Diagnostic test retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async createTest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.createTest(req.body);
      return ApiResponse.created(res, 'Diagnostic test added to catalog successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateTest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.updateTest(req.params.id as string, req.body);
      return ApiResponse.success(res, 'Diagnostic test updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async deleteTest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.deleteTest(req.params.id as string);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  // ----- Admin (web): lab booking oversight -----
  static async listBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.listBookings(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Lab bookings retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.getBookingById(req.params.id as string);
      return ApiResponse.success(res, 'Lab booking retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateBookingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.updateBookingStatus(req.params.id as string, req.body);
      return ApiResponse.success(res, `Lab booking status changed to ${result.status}`, result);
    } catch (error) {
      next(error);
    }
  }

  // ----- Patient (mobile) -----
  static async listPublicTests(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DiagnosticService.listTests(req.query, true);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Diagnostic test catalog retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async book(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await DiagnosticService.book(patientId, req.body);
      return ApiResponse.created(res, 'Lab test booked successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async myBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await DiagnosticService.listBookingsForPatient(patientId, req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Your lab bookings retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async myBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await DiagnosticService.getBookingById(req.params.id as string, patientId);
      return ApiResponse.success(res, 'Lab booking retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}
