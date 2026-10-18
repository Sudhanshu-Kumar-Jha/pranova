import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class AppointmentController {
  // ----- Admin (web) oversight -----
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AppointmentService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Appointments retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AppointmentService.getById(req.params.id as string);
      return ApiResponse.success(res, 'Appointment retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AppointmentService.updateStatus(req.params.id as string, req.body);
      return ApiResponse.success(res, `Appointment status changed to ${result.status}`, result);
    } catch (error) {
      next(error);
    }
  }

  // ----- Patient (mobile) -----
  static async book(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await AppointmentService.book(patientId, req.body);
      return ApiResponse.created(res, 'Appointment booked successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async myAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await AppointmentService.listForPatient(patientId, req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Your appointments retrieved successfully',
        data: result.data,
        meta: { total: result.total, page: result.page, perPage: result.perPage },
      });
    } catch (error) {
      next(error);
    }
  }

  static async myAppointmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await AppointmentService.getById(req.params.id as string, patientId);
      return ApiResponse.success(res, 'Appointment retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Authentication required');
      const result = await AppointmentService.cancel(req.params.id as string, req.body, patientId);
      return ApiResponse.success(res, 'Appointment cancelled successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async videoToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw ApiError.unauthorized('Authentication required');
      const result = await AppointmentService.issueVideoToken(req.params.id as string, userId);
      return ApiResponse.success(res, 'Video consultation token issued', result);
    } catch (error) {
      next(error);
    }
  }
}
