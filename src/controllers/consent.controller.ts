import { Request, Response, NextFunction } from 'express';
import { ConsentService } from '../services/consent.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class ConsentController {
  static async grant(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
      const userAgent = req.headers['user-agent'];

      const consent = await ConsentService.grantConsent(patientId, req.body, ipAddress, userAgent);
      return ApiResponse.created(res, 'Clinical consent granted successfully', consent);
    } catch (error) {
      next(error);
    }
  }

  static async myConsents(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const consents = await ConsentService.listPatientConsents(patientId);
      return ApiResponse.success(res, 'Consents retrieved successfully', consents);
    } catch (error) {
      next(error);
    }
  }

  static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const revoked = await ConsentService.revokeConsent(id, patientId);
      return ApiResponse.success(res, 'Consent revoked successfully', revoked);
    } catch (error) {
      next(error);
    }
  }

  static async check(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.params.patientId as string;
      const cmId = req.user?.id;
      if (!cmId) throw ApiError.unauthorized('Care manager authentication required');

      const activeConsent = await ConsentService.getActiveConsent(patientId, cmId);
      return ApiResponse.success(res, 'Consent check completed', {
        hasConsent: Boolean(activeConsent),
        consent: activeConsent,
      });
    } catch (error) {
      next(error);
    }
  }
}
