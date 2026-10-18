import { CaseStatus, Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { ConsentService } from './consent.service.js';

/** A fix older than this is served, but flagged as stale rather than live. */
const LIVE_FIX_MAX_AGE_MS = 15 * 60_000;

/** Cases still in progress. A closed case stops exposing live position. */
const ACTIVE_STATUSES: CaseStatus[] = [CaseStatus.OPEN, CaseStatus.ASSIGNED, CaseStatus.IN_PROGRESS];

export interface PatientLocationView {
  caseId: string;
  caseNumber: string;
  patientId: string;
  patientName: string | null;
  available: boolean;
  /** Why there is nothing to show, when `available` is false. */
  reason?: string;
  latitude?: number;
  longitude?: number;
  updatedAt?: Date;
  ageMinutes?: number;
  /** LIVE = fresh fix, STALE = last known but older than the live window. */
  freshness?: 'LIVE' | 'STALE';
  /** The registered address, for context only — never the dispatch target. */
  registeredAddress?: string | null;
  /** When the patient's sharing window for this case closes. */
  sharingExpiresAt?: Date | null;
}

/**
 * Reading a patient's live position is the most sensitive thing either console
 * does, so it is gated on three independent conditions rather than on role
 * alone:
 *
 *  1. the case must exist and still be active — closing a case ends sharing;
 *  2. a care manager must be the one assigned to that case;
 *  3. a care manager must additionally hold unexpired consent (granted
 *     automatically when the case was raised, revocable by the patient).
 *
 * Administrators have clinical oversight and skip (3), exactly as
 * `requireConsent` already does for documents — but their read is audited too.
 */
export class PatientLocationService {
  static async getForCase(
    caseId: string,
    requester: { id: string; role: Role; ip?: string }
  ): Promise<PatientLocationView> {
    const found = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        careManagerId: true,
        patientId: true,
        patient: {
          select: {
            id: true,
            patientProfile: {
              select: {
                firstName: true,
                lastName: true,
                primaryAddress: true,
                currentLatitude: true,
                currentLongitude: true,
                lastLocationUpdate: true,
              },
            },
          },
        },
      },
    });

    if (!found) {
      throw ApiError.notFound('Case not found');
    }

    // A care manager may only ever see the patients on their own cases.
    if (requester.role === Role.CARE_MANAGER && found.careManagerId !== requester.id) {
      throw ApiError.notFound('Case not found or not assigned to you');
    }

    if (!ACTIVE_STATUSES.includes(found.status)) {
      throw ApiError.forbidden(
        `Live location sharing ended when this case was ${found.status.toLowerCase()}. Only active cases share a patient position.`
      );
    }

    let sharingExpiresAt: Date | null = null;

    if (requester.role === Role.CARE_MANAGER) {
      const consent = await ConsentService.getActiveConsent(found.patientId, requester.id);
      if (!consent) {
        throw ApiError.forbidden(
          'Location access denied: the patient has not granted you access, or their consent has expired or been revoked.'
        );
      }
      sharingExpiresAt = consent.expiresAt;
    }

    const profile = found.patient?.patientProfile;
    const name = profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() : '';

    const base = {
      caseId: found.id,
      caseNumber: found.caseNumber,
      patientId: found.patientId,
      patientName: name.length > 0 ? name : null,
      registeredAddress: profile?.primaryAddress ?? null,
      sharingExpiresAt,
    };

    // Every read of a position is recorded, successful or empty — this is the
    // access log that makes consent meaningful after the fact.
    await this.audit(caseId, found.caseNumber, requester, profile?.lastLocationUpdate ?? null);

    if (
      profile?.currentLatitude == null ||
      profile?.currentLongitude == null ||
      !profile?.lastLocationUpdate
    ) {
      return {
        ...base,
        available: false,
        reason:
          'No position has been reported by the patient device yet. Call the patient to confirm where they are — the registered address may not be where they are now.',
      };
    }

    const ageMs = Date.now() - new Date(profile.lastLocationUpdate).getTime();

    return {
      ...base,
      available: true,
      latitude: profile.currentLatitude,
      longitude: profile.currentLongitude,
      updatedAt: profile.lastLocationUpdate,
      ageMinutes: Math.max(0, Math.round(ageMs / 60_000)),
      freshness: ageMs <= LIVE_FIX_MAX_AGE_MS ? 'LIVE' : 'STALE',
    };
  }

  /**
   * Records that a responder looked at the patient's position.
   *
   * It lands on the case's own append-only timeline, which both consoles
   * already display — the platform's `AuditLog` model is absent from the
   * current schema, and `DocumentAccessLog` is document-scoped. Writes are
   * throttled to one entry per actor per case per hour so a console that polls
   * for movement cannot bury the clinical history under access records.
   */
  private static async audit(
    caseId: string,
    caseNumber: string,
    requester: { id: string; role: Role; ip?: string },
    fixTakenAt: Date | null
  ) {
    try {
      const since = new Date(Date.now() - 60 * 60_000);
      const recent = await prisma.caseTimeline.findFirst({
        where: {
          caseId,
          actorId: requester.id,
          action: 'PATIENT_LOCATION_VIEWED',
          createdAt: { gt: since },
        },
        select: { id: true },
      });

      if (recent) return;

      await prisma.caseTimeline.create({
        data: {
          caseId,
          actorId: requester.id,
          actorRole: requester.role,
          action: 'PATIENT_LOCATION_VIEWED',
          notes: fixTakenAt
            ? `Patient live position viewed for case ${caseNumber} (fix taken ${new Date(fixTakenAt).toISOString()}).`
            : `Patient live position requested for case ${caseNumber}; no device fix was on file.`,
        },
      });
    } catch {
      // An access record must never stop a responder from seeing where a
      // patient is; the failure surfaces in the server log instead.
      console.error('[ACCESS LOG] Failed to record PATIENT_LOCATION_VIEWED for case', caseId);
    }
  }
}
