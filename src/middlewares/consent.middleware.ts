import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError.js';
import { ConsentService } from '../services/consent.service.js';
import { prisma } from '../utils/prisma.js';

/**
 * Middleware: requireConsent
 * Enforces that a Care Manager has active, unexpired consent for a patient's documents.
 * Admins bypass this check. Patients accessing their own records bypass this check.
 */
export const requireConsent = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Admins have clinical oversight access
    if (user.role === Role.ADMIN) {
      return next();
    }

    // Resolve target patientId from route params or query or document record
    let targetPatientId: string | undefined =
      (req.params.patientId as string) || (req.query.patientId as string);

    // If route specifies :id (document id), look up the document's patientId
    if (!targetPatientId && req.params.id) {
      const docId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const doc = await prisma.document.findUnique({
        where: { id: docId },
        select: { patientId: true },
      });
      if (doc) {
        targetPatientId = doc.patientId;
      }
    }

    if (!targetPatientId) {
      throw ApiError.badRequest('Unable to determine patient identity for clinical consent validation');
    }

    // If patient is accessing their own records
    if (user.role === Role.PATIENT && user.id === targetPatientId) {
      return next();
    }

    // For Care Managers, strictly verify active unexpired consent
    if (user.role === Role.CARE_MANAGER) {
      const hasConsent = await ConsentService.hasActiveConsent(targetPatientId, user.id);
      if (!hasConsent) {
        throw ApiError.forbidden(
          'Clinical Document Access Denied: You do not possess active, unexpired consent from this patient'
        );
      }
      return next();
    }

    throw ApiError.forbidden('Forbidden: Role unauthorized to access clinical documents');
  } catch (error) {
    next(error);
  }
};
