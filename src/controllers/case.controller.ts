import { Request, Response, NextFunction } from 'express';
import { CaseService } from '../services/case.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getIO } from '../socket/index.js';
import { triggerEmergencySOS } from '../socket/emergency.handler.js';
import { ExportService } from '../services/export.service.js';

export class CaseController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CaseService.list(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Cases retrieved successfully',
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
      const caseRecord = await CaseService.getById(id);
      return ApiResponse.success(res, 'Case details retrieved successfully', caseRecord);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.id;
      const actorRole = req.user?.role;
      const caseRecord = await CaseService.create(req.body, actorId, actorRole);
      return ApiResponse.created(res, 'Case registered successfully', caseRecord);
    } catch (error) {
      next(error);
    }
  }

  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const actorId = req.user?.id;
      const actorRole = req.user?.role;
      const updatedCase = await CaseService.assign(id, req.body, actorId, actorRole);
      return ApiResponse.success(res, 'Case assigned to Care Manager successfully', updatedCase);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const actorId = req.user?.id;
      const actorRole = req.user?.role;
      const updatedCase = await CaseService.updateStatus(id, req.body, actorId, actorRole);
      return ApiResponse.success(res, 'Case status updated successfully', updatedCase);
    } catch (error) {
      next(error);
    }
  }

  static async triggerSos(req: Request, res: Response, next: NextFunction) {
    try {
      const io = getIO();
      const result = await triggerEmergencySOS(io, req.body);
      return ApiResponse.created(res, 'P1 Emergency SOS activated and broadcast to Admin console', result);
    } catch (error) {
      next(error);
    }
  }

  static async exportCases(req: Request, res: Response, next: NextFunction) {
    try {
      const reason = req.body?.reason || (req.query?.reason as string);
      const actorId = req.user?.id;
      const actorEmail = req.user?.email || 'admin@pranova.com';

      const result = await ExportService.exportCasesToExcel(reason, actorId, actorEmail);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      return res.status(200).send(result.buffer);
    } catch (error) {
      next(error);
    }
  }

  static async acknowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adminId = req.user?.id;
      const result = await CaseService.acknowledge(id, adminId);
      return ApiResponse.success(res, 'Emergency alert acknowledged successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async myCases(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      const result = await CaseService.list({ ...req.query, patientId });
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Patient coordination cases retrieved successfully',
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
}
