import { randomUUID } from 'crypto';
import { AppointmentStatus, AppointmentType, DoctorStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { generateReference } from '../utils/reference.js';
import {
  BookAppointmentInput,
  UpdateAppointmentStatusInput,
  CancelAppointmentInput,
} from '../validators/appointment.validator.js';
import { AppointmentQueryFilter } from '../types/query.types.js';
import { getPagination, getSort } from '../utils/pagination.js';

const VIDEO_BASE_URL = process.env.VIDEO_BASE_URL || 'https://meet.pranova.health';

const appointmentInclude = {
  doctor: { select: { id: true, firstName: true, lastName: true, photoUrl: true, specialty: { select: { name: true } } } },
  patient: { select: { id: true, email: true, phone: true, patientProfile: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.AppointmentInclude;

/**
 * Terminal appointment states cannot transition further.
 */
const TERMINAL_STATES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

export class AppointmentService {
  static async list(query: AppointmentQueryFilter) {
    const { page, perPage, skip, take } = getPagination(query, 10);
    const { field: sort, order } = getSort(
      query,
      ['scheduledStart', 'createdAt', 'status', 'fee'],
      'scheduledStart',
      'desc'
    );

    const where: Prisma.AppointmentWhereInput = {
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await prisma.appointment.count({ where });
    const appointments = await prisma.appointment.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: appointmentInclude,
    });

    return { data: appointments, total, page, perPage };
  }

  static async getById(id: string, patientId?: string) {
    const appointment = await prisma.appointment.findUnique({ where: { id }, include: appointmentInclude });
    if (!appointment) throw ApiError.notFound('Appointment not found');
    if (patientId && appointment.patientId !== patientId) {
      throw ApiError.forbidden('You can only access your own appointments');
    }
    return appointment;
  }

  /**
   * Books an appointment for a patient. For VIDEO/AUDIO consults a unique
   * video room is provisioned. The fee is resolved from the doctor's tariff.
   */
  static async book(patientId: string, input: BookAppointmentInput) {
    const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
    if (!doctor) throw ApiError.badRequest('The supplied doctorId does not exist');
    if (doctor.status !== DoctorStatus.ACTIVE) {
      throw ApiError.badRequest('This doctor is not currently accepting appointments');
    }

    const type = input.type ?? AppointmentType.VIDEO;
    if (type === AppointmentType.VIDEO && !doctor.isVideoEnabled) {
      throw ApiError.badRequest('This doctor does not offer video consultation');
    }
    if (type === AppointmentType.AUDIO && !doctor.isAudioEnabled && !doctor.isVideoEnabled) {
      throw ApiError.badRequest('This doctor does not offer audio consultation');
    }

    const start = input.scheduledStart;
    if (start.getTime() < Date.now()) {
      throw ApiError.badRequest('scheduledStart must be in the future');
    }
    const durationMinutes = input.durationMinutes ?? 30;
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    const fee =
      type === AppointmentType.IN_CLINIC
        ? doctor.consultationFeeClinic
        : type === AppointmentType.AUDIO
          ? (doctor.consultationFeeAudio || doctor.consultationFeeVideo)
          : doctor.consultationFeeVideo;
    const isTele = type === AppointmentType.VIDEO || type === AppointmentType.AUDIO;
    const videoRoomId = isTele ? randomUUID() : null;
    const videoJoinUrl = videoRoomId ? `${VIDEO_BASE_URL}/room/${videoRoomId}` : null;

    return prisma.appointment.create({
      data: {
        appointmentNumber: generateReference('APT'),
        patientId,
        doctorId: doctor.id,
        type,
        status: AppointmentStatus.CONFIRMED,
        scheduledStart: start,
        scheduledEnd: end,
        reason: input.reason,
        symptoms: input.symptoms,
        fee,
        videoRoomId,
        videoJoinUrl,
      },
      include: appointmentInclude,
    });
  }

  static async updateStatus(id: string, input: UpdateAppointmentStatusInput) {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Appointment not found');
    if (TERMINAL_STATES.includes(existing.status)) {
      throw ApiError.badRequest(`Appointment is already ${existing.status} and cannot be changed`);
    }
    return prisma.appointment.update({
      where: { id },
      data: {
        status: input.status,
        prescriptionNote: input.prescriptionNote ?? undefined,
        completedAt: input.status === AppointmentStatus.COMPLETED ? new Date() : undefined,
      },
      include: appointmentInclude,
    });
  }

  static async cancel(id: string, input: CancelAppointmentInput, patientId?: string) {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Appointment not found');
    if (patientId && existing.patientId !== patientId) {
      throw ApiError.forbidden('You can only cancel your own appointments');
    }
    if (TERMINAL_STATES.includes(existing.status)) {
      throw ApiError.badRequest(`Appointment is already ${existing.status}`);
    }
    return prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED, cancelReason: input.cancelReason },
      include: appointmentInclude,
    });
  }

  static async listForPatient(patientId: string, query: AppointmentQueryFilter) {
    return this.list({ ...query, patientId });
  }

  /**
   * Issues a short-lived join credential for a tele-consultation room.
   * NOTE: This is a mock token for local development. In production this
   * would be minted by the video provider SDK (Agora / Twilio / 100ms / Daily).
   */
  static async issueVideoToken(id: string, userId: string) {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw ApiError.notFound('Appointment not found');
    if (appointment.patientId !== userId) {
      throw ApiError.forbidden('You can only join your own consultation');
    }
    if (!appointment.videoRoomId) {
      throw ApiError.badRequest('This appointment is not a tele-consultation');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw ApiError.badRequest('This appointment has been cancelled');
    }
    const token = Buffer.from(`${appointment.videoRoomId}:${userId}:${Date.now()}`).toString('base64url');
    return {
      appointmentId: appointment.id,
      roomId: appointment.videoRoomId,
      joinUrl: appointment.videoJoinUrl,
      token,
      expiresInSeconds: 3600,
      provider: 'mock-local',
    };
  }
}
