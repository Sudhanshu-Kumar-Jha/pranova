import { CaseStatus, Role, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { ConsentService } from './consent.service.js';
import { getPagination, getSort } from '../utils/pagination.js';
import { BasePaginationQuery } from '../types/query.types.js';
import { CmUpdateCaseStatusInput, CmAvailabilityInput } from '../validators/cm.validator.js';
import { getIO } from '../socket/index.js';

const ACTIVE_STATUSES: CaseStatus[] = [CaseStatus.OPEN, CaseStatus.ASSIGNED, CaseStatus.IN_PROGRESS];

const caseInclude = {
  patient: {
    select: {
      id: true,
      phone: true,
      patientProfile: { select: { firstName: true, lastName: true, bloodGroup: true, primaryAddress: true } },
    },
  },
  provider: { select: { id: true, name: true, type: true, city: true, phone: true } },
} satisfies Prisma.CaseInclude;

/**
 * Care Manager mobile-app service. Every method is scoped to the authenticated
 * care manager (their own cases / profile only) — enforced via requireCareManager
 * at the route layer and the userId checks here.
 */
export class CmService {
  static async getProfile(userId: string) {
    const profile = await prisma.careManagerProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.notFound('Care manager profile not found');
    const activeCases = await prisma.case.count({
      where: { careManagerId: userId, status: { in: ACTIVE_STATUSES } },
    });
    return { ...profile, activeCases };
  }

  static async listCases(userId: string, query: BasePaginationQuery & { status?: CaseStatus }) {
    const { page, perPage, skip, take } = getPagination(query, 10);
    const { field: sort, order } = getSort(query, ['createdAt', 'priority', 'status', 'assignedAt'], 'createdAt', 'desc');

    const where: Prisma.CaseWhereInput = {
      careManagerId: userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await prisma.case.count({ where });
    const cases = await prisma.case.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: caseInclude,
    });
    return { data: cases, total, page, perPage };
  }

  static async getCase(userId: string, id: string) {
    const found = await prisma.case.findFirst({
      where: { id, careManagerId: userId },
      include: {
        ...caseInclude,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!found) throw ApiError.notFound('Case not found or not assigned to you');
    return found;
  }

  static async updateCaseStatus(userId: string, id: string, input: CmUpdateCaseStatusInput) {
    const existing = await prisma.case.findFirst({
      where: { id, careManagerId: userId },
      include: {
        careManager: {
          include: { careManagerProfile: true },
        },
      },
    });
    if (!existing) throw ApiError.notFound('Case not found or not assigned to you');
    if (existing.status === CaseStatus.RESOLVED || existing.status === CaseStatus.CANCELLED) {
      throw ApiError.badRequest(`Case is already ${existing.status}`);
    }

    // Automatically resolve location:
    // 1. Direct GPS fix from mobile request payload
    // 2. Fallback to Care Manager's last recorded GPS coordinates from profile
    const effectiveLat = input.latitude ?? existing.careManager?.careManagerProfile?.currentLatitude ?? null;
    const effectiveLng = input.longitude ?? existing.careManager?.careManagerProfile?.currentLongitude ?? null;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCase = await tx.case.update({
        where: { id },
        data: {
          status: input.status,
          resolvedAt: input.status === CaseStatus.RESOLVED ? new Date() : existing.resolvedAt,
        },
        include: caseInclude,
      });

      await tx.caseTimeline.create({
        data: {
          caseId: id,
          actorId: userId,
          actorRole: Role.CARE_MANAGER,
          action: input.status === existing.status ? 'NOTE_ADDED' : 'STATUS_UPDATED',
          oldStatus: existing.status,
          newStatus: input.status,
          notes: input.notes,
          locationLatitude: effectiveLat,
          locationLongitude: effectiveLng,
        },
      });

      // Synchronize Care Manager's real-time position with their latest GPS fix from the field
      if (input.latitude != null && input.longitude != null) {
        await tx.careManagerProfile.updateMany({
          where: { userId },
          data: {
            currentLatitude: input.latitude,
            currentLongitude: input.longitude,
            lastLocationUpdate: new Date(),
          },
        });
      }

      return updatedCase;
    });

    // The emergency is over, so close the patient's location-sharing window
    // instead of leaving it open until it expires.
    const SHARING_ENDING_STATUSES: CaseStatus[] = [
      CaseStatus.COMPLETED_AWAITING_PAYMENT,
      CaseStatus.PAID,
      CaseStatus.RESOLVED,
      CaseStatus.CANCELLED,
    ];
    if (SHARING_ENDING_STATUSES.includes(input.status)) {
      try {
        await ConsentService.revokeCaseConsents(id);
      } catch (err: any) {
        console.warn(`[CONSENT] Could not close location sharing for case ${id}: ${err.message}`);
      }
    }

    // Section B.2: Real-time case:status_changed notification to Patient room
    try {
      const io = getIO();
      const statusPayload = {
        caseId: id,
        caseNumber: existing.caseNumber,
        oldStatus: existing.status,
        status: input.status,
        notes: input.notes,
        careManagerName: existing.careManager?.careManagerProfile
          ? `${existing.careManager.careManagerProfile.firstName} ${existing.careManager.careManagerProfile.lastName}`.trim()
          : 'Care Manager',
        updatedAt: new Date().toISOString(),
      };
      io.to(`patient_${existing.patientId}`).emit('case:status_changed', statusPayload);
      io.to('admin_room').emit('case:status_changed', statusPayload);
      console.log(`[SOCKET] CM updated case ${existing.caseNumber} -> ${input.status}. Emitted 'case:status_changed' to 'patient_${existing.patientId}'`);
    } catch (err: any) {
      console.warn(`[SOCKET] Could not emit case:status_changed: ${err.message}`);
    }

    return updated;
  }

  static async addCaseNote(userId: string, id: string, input: { notes: string; latitude?: number | null; longitude?: number | null }) {
    const existing = await prisma.case.findFirst({
      where: { id, careManagerId: userId },
      include: {
        careManager: {
          include: { careManagerProfile: true },
        },
      },
    });
    if (!existing) throw ApiError.notFound('Case not found or not assigned to you');

    const effectiveLat = input.latitude ?? existing.careManager?.careManagerProfile?.currentLatitude ?? null;
    const effectiveLng = input.longitude ?? existing.careManager?.careManagerProfile?.currentLongitude ?? null;

    return prisma.$transaction(async (tx) => {
      const timelineEntry = await tx.caseTimeline.create({
        data: {
          caseId: id,
          actorId: userId,
          actorRole: Role.CARE_MANAGER,
          action: 'NOTE_ADDED',
          oldStatus: existing.status,
          newStatus: existing.status,
          notes: input.notes,
          locationLatitude: effectiveLat,
          locationLongitude: effectiveLng,
        },
      });

      if (input.latitude != null && input.longitude != null) {
        await tx.careManagerProfile.updateMany({
          where: { userId },
          data: {
            currentLatitude: input.latitude,
            currentLongitude: input.longitude,
            lastLocationUpdate: new Date(),
          },
        });
      }

      return timelineEntry;
    });
  }

  static async setAvailability(userId: string, input: CmAvailabilityInput) {
    const profile = await prisma.careManagerProfile.findUnique({ where: { userId } });
    if (!profile) throw ApiError.notFound('Care manager profile not found');
    return prisma.careManagerProfile.update({
      where: { userId },
      data: {
        isAvailable: input.isAvailable ?? undefined,
        currentLatitude: input.latitude ?? undefined,
        currentLongitude: input.longitude ?? undefined,
        lastLocationUpdate: input.latitude != null || input.longitude != null ? new Date() : undefined,
      },
    });
  }
}
