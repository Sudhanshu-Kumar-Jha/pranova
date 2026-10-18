import { Server as SocketIOServer, Socket } from 'socket.io';
import { Role, CasePriority, CaseStatus, CaseTriggerSource, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ConsentService } from '../services/consent.service.js';

export interface EmergencySosPayload {
  patientId?: string;
  patientPhone?: string;
  incidentLatitude?: number | null;
  incidentLongitude?: number | null;
  incidentAddress?: string | null;
  title?: string;
  description?: string;
}

export const triggerEmergencySOS = async (io: SocketIOServer, payload: EmergencySosPayload) => {
  // 1. Resolve Patient
  let patient: (Prisma.UserGetPayload<{ include: { patientProfile: true } }>) | null = null;

  if (payload.patientId) {
    patient = await prisma.user.findFirst({
      where: { id: payload.patientId, role: Role.PATIENT },
      include: { patientProfile: true },
    });
  } else if (payload.patientPhone) {
    patient = await prisma.user.findFirst({
      where: { phone: payload.patientPhone, role: Role.PATIENT },
      include: { patientProfile: true },
    });
  }

  if (!patient) {
    throw new Error('No registered patient profile found in database to attach emergency SOS alert');
  }

  const patientName = patient.patientProfile
    ? `${patient.patientProfile.firstName} ${patient.patientProfile.lastName}`.trim()
    : 'Emergency Patient';

  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const caseNumber = `PRN-${year}-${randomSuffix}`;

  // Section A.4: NO fabricated locations or fallbacks.
  //
  // Where an emergency happened is only ever the device's live fix or the
  // device's last known position. The REGISTERED address is never used as the
  // incident location: a patient who signed up in Delhi and collapses in
  // Bengaluru must not send responders to Delhi. When there is no device
  // position at all the incident location stays null, and the admin console
  // renders its "no pin" state rather than a misleading address.
  const LIVE_POSITION_MAX_AGE_MS = 15 * 60_000;

  const hasLiveFix = payload.incidentLatitude != null && payload.incidentLongitude != null;

  const lastFixAgeMs = patient.patientProfile?.lastLocationUpdate
    ? Date.now() - new Date(patient.patientProfile.lastLocationUpdate).getTime()
    : null;

  const lastFixUsable =
    patient.patientProfile?.currentLatitude != null &&
    patient.patientProfile?.currentLongitude != null &&
    lastFixAgeMs != null &&
    lastFixAgeMs <= LIVE_POSITION_MAX_AGE_MS;

  const incidentLatitude = hasLiveFix
    ? (payload.incidentLatitude as number)
    : lastFixUsable
      ? (patient.patientProfile?.currentLatitude as number)
      : null;

  const incidentLongitude = hasLiveFix
    ? (payload.incidentLongitude as number)
    : lastFixUsable
      ? (patient.patientProfile?.currentLongitude as number)
      : null;

  // Only an address resolved from the device's own position may describe the
  // incident. The registered address stays on the patient record where it
  // belongs (and where the console already shows it).
  const incidentAddress = hasLiveFix ? payload.incidentAddress?.trim() || null : null;

  // Recorded on the timeline so a dispatcher can always tell how the pin was
  // obtained instead of having to trust it.
  const locationProvenance = hasLiveFix
    ? 'Location: live GPS fix from the patient device.'
    : lastFixUsable
      ? `Location: last known device position, ${Math.round((lastFixAgeMs as number) / 60_000)} minute(s) old. No fresh GPS fix at SOS time.`
      : 'Location: UNAVAILABLE — the device returned no GPS fix. Call the patient to confirm where they are; the registered address on file may not be where they are now.';

  // 2. Transactionally create P1 Case + CaseTimeline
  const createdCase = await prisma.$transaction(async (tx) => {
    const newCase = await tx.case.create({
      data: {
        caseNumber,
        patientId: patient.id,
        priority: CasePriority.P1,
        status: CaseStatus.OPEN,
        title: payload.title || 'EMERGENCY SOS: Acute Medical Distress Triggered',
        description:
          payload.description ||
          'Patient triggered immediate emergency SOS signal via mobile application. Immediate care manager and ambulance triage required.',
        triggerSource: CaseTriggerSource.SOS_BUTTON,
        incidentAddress,
        incidentLatitude,
        incidentLongitude,
      },
    });

    await tx.caseTimeline.create({
      data: {
        caseId: newCase.id,
        actorId: patient.id,
        actorRole: Role.PATIENT,
        action: 'EMERGENCY_SOS_TRIGGERED',
        newStatus: CaseStatus.OPEN,
        notes: `${
          payload.description ||
          'Emergency SOS button triggered from mobile application. Immediate triage initiated.'
        }\n${locationProvenance}`,
        locationLatitude: incidentLatitude,
        locationLongitude: incidentLongitude,
      },
    });

    // A live fix refreshes the patient's LAST KNOWN POSITION only. The
    // registered address and its delivery coordinates are never overwritten by
    // an emergency — that address is what the patient typed for deliveries, and
    // silently replacing it with wherever they collapsed would corrupt it.
    if (patient.patientProfile && hasLiveFix) {
      await tx.patientProfile.update({
        where: { userId: patient.id },
        data: {
          currentLatitude: incidentLatitude,
          currentLongitude: incidentLongitude,
          lastLocationUpdate: new Date(),
        },
      });
    }

    return newCase;
  });

  // An SOS opens a time-boxed location-sharing window for the response team,
  // recorded as a Consent row the patient can see and revoke in the app. It is
  // outside the transaction above so a consent write can never roll back a
  // created emergency.
  try {
    await ConsentService.grantCaseLocationConsent({
      patientId: patient.id,
      caseId: createdCase.id,
      caseNumber: createdCase.caseNumber,
      careManagerId: null,
    });
  } catch (err: any) {
    console.warn(`[CONSENT] Could not open location sharing for SOS case ${createdCase.caseNumber}: ${err.message}`);
  }

  // Section A.3: Trim sensitive PHI (e.g. blood group removed from socket broadcast).
  // Incident coordinates are null if no GPS fix is available.
  const emergencyAlertPayload = {
    caseId: createdCase.id,
    caseNumber: createdCase.caseNumber,
    priority: 'P1',
    status: 'OPEN',
    title: createdCase.title,
    description: createdCase.description,
    patientId: patient.id,
    patientName,
    patientPhone: patient.phone,
    incidentAddress: createdCase.incidentAddress,
    incidentLatitude: createdCase.incidentLatitude,
    incidentLongitude: createdCase.incidentLongitude,
    // Lets the console say whether the pin is a live fix, a stale one, or
    // missing, instead of presenting every pin as equally trustworthy.
    locationSource: hasLiveFix ? 'LIVE' : lastFixUsable ? 'LAST_KNOWN' : 'NONE',
    timestamp: new Date().toISOString(),
  };

  // Section A.3: Emit real-time emergency alert ONLY to authenticated admin_room
  console.log(`[SOCKET] Broadcasting 'admin:new_emergency' ONLY to 'admin_room' for Case ${createdCase.caseNumber}`);
  io.to('admin_room').emit('admin:new_emergency', emergencyAlertPayload);

  return emergencyAlertPayload;
};

export const handleEmergencyEvent = async (
  io: SocketIOServer,
  _socket: Socket,
  payload: EmergencySosPayload
) => {
  return triggerEmergencySOS(io, payload);
};
