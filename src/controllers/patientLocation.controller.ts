import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { PatientLocationService } from '../services/patientLocation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Serves a patient's live position for one case, to the two surfaces that may
 * ever see it: the admin console (clinical oversight) and the care manager
 * assigned to that case. All gating lives in the service so both callers are
 * held to the same rules.
 */
export class PatientLocationController {
  /** Admin console: GET /api/v1/cases/:id/patient-location */
  static async forAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.id;
      if (!actorId) throw ApiError.unauthorized('Authentication required');

      const result = await PatientLocationService.getForCase(req.params.id as string, {
        id: actorId,
        role: Role.ADMIN,
        ip: req.ip,
      });
      return ApiResponse.success(res, 'Patient location retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  /** Care Manager app: GET /api/v1/cm/cases/:id/patient-location */
  static async forCareManager(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.id;
      if (!actorId) throw ApiError.unauthorized('Authentication required');

      const result = await PatientLocationService.getForCase(req.params.id as string, {
        id: actorId,
        role: Role.CARE_MANAGER,
        ip: req.ip,
      });
      return ApiResponse.success(res, 'Patient location retrieved', result);
    } catch (error) {
      next(error);
    }
  }
}
