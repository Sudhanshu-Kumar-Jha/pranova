import { ConsentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { GrantConsentInput } from '../validators/consent.validator.js';

export class ConsentService {
  /**
   * Grant consent from a patient to a Care Manager or Provider
   */
  static async grantConsent(
    patientId: string,
    input: GrantConsentInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (!input.careManagerId && !input.providerId) {
      throw ApiError.badRequest('Either careManagerId or providerId must be specified for clinical consent');
    }

    const durationHours = input.durationHours || 24;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    // If there is an existing active consent for this CM/provider, revoke it first
    if (input.careManagerId) {
      await prisma.consent.updateMany({
        where: {
          patientId,
          careManagerId: input.careManagerId,
          status: ConsentStatus.GRANTED,
        },
        data: {
          status: ConsentStatus.REVOKED,
          revokedAt: new Date(),
        },
      });
    }

    const consent = await prisma.consent.create({
      data: {
        patientId,
        careManagerId: input.careManagerId || null,
        providerId: input.providerId || null,
        purpose: input.purpose,
        scope: input.scope,
        status: ConsentStatus.GRANTED,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      include: {
        careManager: {
          include: { careManagerProfile: true },
        },
        provider: true,
      },
    });

    return consent;
  }

  /**
   * List all consents granted by a patient
   */
  static async listPatientConsents(patientId: string) {
    const consents = await prisma.consent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        careManager: {
          include: { careManagerProfile: true },
        },
        provider: true,
      },
    });

    // Check expiration and return formatted records
    const now = new Date();
    return consents.map((c) => {
      const isExpired = c.status === ConsentStatus.GRANTED && c.expiresAt < now;
      const effectiveStatus = isExpired ? ConsentStatus.EXPIRED : c.status;

      return {
        id: c.id,
        careManagerId: c.careManagerId,
        careManagerName: c.careManager?.careManagerProfile
          ? `${c.careManager.careManagerProfile.firstName} ${c.careManager.careManagerProfile.lastName}`.trim()
          : null,
        providerId: c.providerId,
        providerName: c.provider?.name || null,
        purpose: c.purpose,
        scope: c.scope,
        status: effectiveStatus,
        isActive: effectiveStatus === ConsentStatus.GRANTED,
        grantedAt: c.grantedAt,
        expiresAt: c.expiresAt,
        revokedAt: c.revokedAt,
      };
    });
  }

  /**
   * Revoke an active consent
   */
  static async revokeConsent(consentId: string, patientId: string) {
    const consent = await prisma.consent.findFirst({
      where: { id: consentId, patientId },
    });

    if (!consent) {
      throw ApiError.notFound('Consent record not found or does not belong to you');
    }

    if (consent.status === ConsentStatus.REVOKED) {
      throw ApiError.badRequest('Consent is already revoked');
    }

    const updated = await prisma.consent.update({
      where: { id: consentId },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Check if active consent exists between a patient and a Care Manager
   */
  static async hasActiveConsent(patientId: string, careManagerId: string) {
    const now = new Date();
    const consent = await prisma.consent.findFirst({
      where: {
        patientId,
        careManagerId,
        status: ConsentStatus.GRANTED,
        expiresAt: { gt: now },
      },
    });

    return Boolean(consent);
  }

  /**
   * Retrieve active consent record between patient and Care Manager
   */
  static async getActiveConsent(patientId: string, careManagerId: string) {
    const now = new Date();
    return prisma.consent.findFirst({
      where: {
        patientId,
        careManagerId,
        status: ConsentStatus.GRANTED,
        expiresAt: { gt: now },
      },
    });
  }
}
