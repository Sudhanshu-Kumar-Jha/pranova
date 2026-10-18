import { Role, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { CreatePatientInput, UpdatePatientInput } from '../validators/patient.validator.js';
import { PatientQueryFilter } from '../types/query.types.js';

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
