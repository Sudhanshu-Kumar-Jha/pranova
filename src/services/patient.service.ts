import { Role, UserStatus, Prisma, CaseStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import {
  CreatePatientInput,
  UpdatePatientInput,
  UpdateMyLocationInput,
} from '../validators/patient.validator.js';
import { PatientQueryFilter } from '../types/query.types.js';
import { getIO } from '../socket/index.js';

export class PatientService {
  /**
   * List Patients with pagination, search filter, and sorting
   */
  static async list(query: PatientQueryFilter) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const perPage = Math.max(1, parseInt(query.perPage || '10', 10));
    const sort = query.sort || 'createdAt';
    const order = (query.order || 'DESC').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const search = query.q || query.name || query.phone;

    const where: Prisma.UserWhereInput = {
      role: Role.PATIENT,
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { email: { contains: search } },
              {
                patientProfile: {
                  OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { city: { contains: search } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { [sort]: order },
        include: {
          patientProfile: true,
          _count: {
            select: { casesAsPatient: true },
          },
        },
      });

    const formattedData = users.map((user) => ({
      id: user.id,
      phone: user.phone,
      email: user.email,
      status: user.status,
      firstName: user.patientProfile?.firstName || '',
      lastName: user.patientProfile?.lastName || '',
      fullName: `${user.patientProfile?.firstName || ''} ${user.patientProfile?.lastName || ''}`.trim(),
      dateOfBirth: user.patientProfile?.dateOfBirth,
      gender: user.patientProfile?.gender,
      bloodGroup: user.patientProfile?.bloodGroup,
      primaryAddress: user.patientProfile?.primaryAddress,
      city: user.patientProfile?.city,
      state: user.patientProfile?.state,
      pincode: user.patientProfile?.pincode,
      latitude: user.patientProfile?.latitude,
      longitude: user.patientProfile?.longitude,
      currentLatitude: user.patientProfile?.currentLatitude,
      currentLongitude: user.patientProfile?.currentLongitude,
      lastLocationUpdate: user.patientProfile?.lastLocationUpdate,
      emergencyContactName: user.patientProfile?.emergencyContactName,
      emergencyContactPhone: user.patientProfile?.emergencyContactPhone,
      medicalHistory: user.patientProfile?.medicalHistory,
      casesCount: user._count.casesAsPatient,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      data: formattedData,
      total,
      page,
      perPage,
    };
  }

  /**
   * Get single Patient by ID
   */
  static async getById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, role: Role.PATIENT },
      include: {
        patientProfile: true,
        casesAsPatient: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user || !user.patientProfile) {
      throw ApiError.notFound('Patient record not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      status: user.status,
      firstName: user.patientProfile.firstName,
      lastName: user.patientProfile.lastName,
      fullName: `${user.patientProfile.firstName} ${user.patientProfile.lastName}`.trim(),
      dateOfBirth: user.patientProfile.dateOfBirth,
      gender: user.patientProfile.gender,
      bloodGroup: user.patientProfile.bloodGroup,
      primaryAddress: user.patientProfile.primaryAddress,
      city: user.patientProfile.city,
      state: user.patientProfile.state,
      pincode: user.patientProfile.pincode,
      latitude: user.patientProfile.latitude,
      longitude: user.patientProfile.longitude,
      currentLatitude: user.patientProfile.currentLatitude,
      currentLongitude: user.patientProfile.currentLongitude,
      lastLocationUpdate: user.patientProfile.lastLocationUpdate,
      emergencyContactName: user.patientProfile.emergencyContactName,
      emergencyContactPhone: user.patientProfile.emergencyContactPhone,
      medicalHistory: user.patientProfile.medicalHistory,
      recentCases: user.casesAsPatient,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Create Patient (Transactional User + Profile)
   */
  static async create(input: CreatePatientInput) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: input.phone },
    });

    if (existingUser) {
      throw ApiError.conflict('A user with this phone number is already registered');
    }

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email ? input.email.toLowerCase() : null,
          role: Role.PATIENT,
          status: UserStatus.ACTIVE,
          isPhoneVerified: true,
        },
      });

      const profile = await tx.patientProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender,
          bloodGroup: input.bloodGroup,
          primaryAddress: input.primaryAddress,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
          medicalHistory: input.medicalHistory || Prisma.JsonNull,
        },
      });

      return { ...user, patientProfile: profile };
    });

    return this.getById(newUser.id);
  }

  /**
   * Update Patient details
   */
  static async update(id: string, input: UpdatePatientInput) {
    const user = await prisma.user.findFirst({
      where: { id, role: Role.PATIENT },
      include: { patientProfile: true },
    });

    if (!user) {
      throw ApiError.notFound('Patient record not found');
    }

    await prisma.$transaction(async (tx) => {
      if (input.phone || input.email) {
        await tx.user.update({
          where: { id },
          data: {
            phone: input.phone || undefined,
            email: input.email ? input.email.toLowerCase() : undefined,
          },
        });
      }

      await tx.patientProfile.upsert({
        where: { userId: id },
        update: {
          firstName: input.firstName || undefined,
          lastName: input.lastName || undefined,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          gender: input.gender || undefined,
          bloodGroup: input.bloodGroup || undefined,
          primaryAddress: input.primaryAddress || undefined,
          city: input.city || undefined,
          state: input.state || undefined,
          pincode: input.pincode || undefined,
          latitude: input.latitude !== undefined ? input.latitude : undefined,
          longitude: input.longitude !== undefined ? input.longitude : undefined,
          emergencyContactName: input.emergencyContactName || undefined,
          emergencyContactPhone: input.emergencyContactPhone || undefined,
          medicalHistory: input.medicalHistory !== undefined ? (input.medicalHistory || Prisma.JsonNull) : undefined,
        },
        create: {
          userId: id,
          firstName: input.firstName || 'Patient',
          lastName: input.lastName || 'User',
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender || null,
          bloodGroup: input.bloodGroup || null,
          primaryAddress: input.primaryAddress || null,
          city: input.city || null,
          state: input.state || null,
          pincode: input.pincode || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          emergencyContactName: input.emergencyContactName || null,
          emergencyContactPhone: input.emergencyContactPhone || null,
          medicalHistory: input.medicalHistory || Prisma.JsonNull,
        },
      });
    });

    return this.getById(id);
  }

  /**
   * Delete Patient
   */
  /**
   * Record the patient's live device position (`PATCH /app/location`).
   *
   * Deliberately narrow: it writes only the three telemetry columns and never
   * the registered address or its coordinates. A patient who registered in
   * Delhi and is now in Bengaluru must dispatch to Bengaluru, while pharmacy
   * delivery still goes to the address they typed.
   */
  static async updateMyLocation(userId: string, input: UpdateMyLocationInput) {
    const profile = await prisma.patientProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw ApiError.notFound('Patient profile not found');
    }

    const updated = await prisma.patientProfile.update({
      where: { userId },
      data: {
        currentLatitude: input.latitude,
        currentLongitude: input.longitude,
        lastLocationUpdate: new Date(),
      },
      select: {
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
      },
    });

    // While an emergency is open, the response team should watch the patient
    // move rather than re-poll. The position is pushed only to the rooms that
    // are already entitled to it: the admin console, and the care manager this
    // case is assigned to. A patient with no active case is never broadcast.
    const activeCases = await prisma.case.findMany({
      where: {
        patientId: userId,
        status: { in: [CaseStatus.OPEN, CaseStatus.ASSIGNED, CaseStatus.IN_PROGRESS] },
      },
      select: { id: true, caseNumber: true, careManagerId: true },
    });

    if (activeCases.length > 0) {
      try {
        const io = getIO();
        for (const activeCase of activeCases) {
          const payload = {
            caseId: activeCase.id,
            caseNumber: activeCase.caseNumber,
            patientId: userId,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy ?? null,
            updatedAt: updated.lastLocationUpdate,
          };
          io.to('admin_room').emit('patient:location', payload);
          if (activeCase.careManagerId) {
            io.to(`care_manager_${activeCase.careManagerId}`).emit('patient:location', payload);
          }
        }
      } catch (err: any) {
        // Telemetry is stored either way; only the live push is lost.
        console.warn(`[SOCKET] Could not emit patient:location: ${err.message}`);
      }
    }

    return updated;
  }

  static async delete(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, role: Role.PATIENT },
    });

    if (!user) {
      throw ApiError.notFound('Patient record not found');
    }

    await prisma.user.delete({
      where: { id },
    });

    return { id, message: 'Patient removed successfully' };
  }
}
