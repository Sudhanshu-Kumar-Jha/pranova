import { DoctorStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import {
  CreateDoctorInput,
  UpdateDoctorInput,
  UpdateDoctorStatusInput,
  CreateSlotInput,
} from '../validators/doctor.validator.js';
import { DoctorQueryFilter } from '../types/query.types.js';
import { getPagination, getSort } from '../utils/pagination.js';

const doctorInclude = {
  specialty: { select: { id: true, name: true, iconKey: true } },
  provider: { select: { id: true, name: true, type: true, city: true } },
} satisfies Prisma.DoctorInclude;

export class DoctorService {
  /**
   * List doctors. When `activeOnly` is true (patient/mobile catalog) only
   * ACTIVE doctors are returned, honoring strict platform separation.
   */
  static async list(query: DoctorQueryFilter, activeOnly = false) {
    const { page, perPage, skip, take } = getPagination(query, 10);
    const { field: sort, order } = getSort(
      query,
      ['rating', 'experienceYears', 'consultationFeeVideo', 'consultationFeeAudio', 'consultationFeeClinic', 'firstName', 'createdAt'],
      'rating',
      'desc'
    );
    const search = query.q || query.name;

    const where: Prisma.DoctorWhereInput = {
      ...(activeOnly ? { status: DoctorStatus.ACTIVE } : query.status ? { status: query.status } : {}),
      ...(query.specialtyId ? { specialtyId: query.specialtyId } : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.city ? { city: { contains: query.city } } : {}),
      ...(query.isVideoEnabled !== undefined ? { isVideoEnabled: query.isVideoEnabled === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { specialty: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const total = await prisma.doctor.count({ where });
    const doctors = await prisma.doctor.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: doctorInclude,
    });

    return { data: doctors, total, page, perPage };
  }

  static async getById(id: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        ...doctorInclude,
        slots: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      },
    });
    if (!doctor) throw ApiError.notFound('Doctor not found');
    return doctor;
  }

  static async create(input: CreateDoctorInput) {
    const specialty = await prisma.specialty.findUnique({ where: { id: input.specialtyId } });
    if (!specialty) throw ApiError.badRequest('The supplied specialtyId does not exist');

    return prisma.doctor.create({
      data: {
        specialtyId: input.specialtyId,
        providerId: input.providerId ?? null,
        userId: input.userId ?? null,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        registrationNumber: input.registrationNumber,
        qualifications: input.qualifications,
        experienceYears: input.experienceYears ?? 0,
        bio: input.bio,
        languages: input.languages,
        consultationFeeVideo: input.consultationFeeVideo ?? 0,
        consultationFeeAudio: input.consultationFeeAudio ?? 0,
        consultationFeeClinic: input.consultationFeeClinic ?? 0,
        city: input.city,
        clinicAddress: input.clinicAddress,
        photoUrl: input.photoUrl,
        isVideoEnabled: input.isVideoEnabled ?? true,
        isAudioEnabled: input.isAudioEnabled ?? true,
        status: input.status ?? DoctorStatus.ACTIVE,
      },
      include: doctorInclude,
    });
  }

  static async update(id: string, input: UpdateDoctorInput) {
    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Doctor not found');
    if (input.specialtyId) {
      const specialty = await prisma.specialty.findUnique({ where: { id: input.specialtyId } });
      if (!specialty) throw ApiError.badRequest('The supplied specialtyId does not exist');
    }

    return prisma.doctor.update({
      where: { id },
      data: {
        specialtyId: input.specialtyId,
        providerId: input.providerId,
        firstName: input.firstName,
        lastName: input.lastName,
        gender: input.gender,
        registrationNumber: input.registrationNumber,
        qualifications: input.qualifications,
        experienceYears: input.experienceYears,
        bio: input.bio,
        languages: input.languages,
        consultationFeeVideo: input.consultationFeeVideo,
        consultationFeeAudio: input.consultationFeeAudio,
        consultationFeeClinic: input.consultationFeeClinic,
        city: input.city,
        clinicAddress: input.clinicAddress,
        photoUrl: input.photoUrl,
        isVideoEnabled: input.isVideoEnabled,
        isAudioEnabled: input.isAudioEnabled,
        status: input.status,
      },
      include: doctorInclude,
    });
  }

  static async updateStatus(id: string, input: UpdateDoctorStatusInput) {
    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Doctor not found');
    return prisma.doctor.update({ where: { id }, data: { status: input.status }, include: doctorInclude });
  }

  static async delete(id: string) {
    const existing = await prisma.doctor.findUnique({
      where: { id },
      include: { _count: { select: { appointments: true } } },
    });
    if (!existing) throw ApiError.notFound('Doctor not found');
    if (existing._count.appointments > 0) {
      throw ApiError.badRequest('Cannot delete a doctor with existing appointments. Set status to INACTIVE instead.');
    }
    await prisma.doctor.delete({ where: { id } });
    return { id, message: 'Doctor removed successfully' };
  }

  static async addSlot(doctorId: string, input: CreateSlotInput) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw ApiError.notFound('Doctor not found');
    return prisma.doctorSlot.create({
      data: {
        doctorId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        type: input.type,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async removeSlot(doctorId: string, slotId: string) {
    const slot = await prisma.doctorSlot.findFirst({ where: { id: slotId, doctorId } });
    if (!slot) throw ApiError.notFound('Slot not found for this doctor');
    await prisma.doctorSlot.delete({ where: { id: slotId } });
    return { id: slotId, message: 'Slot removed successfully' };
  }
}
