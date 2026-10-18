import { Role, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { CreateCareManagerInput, UpdateCareManagerInput } from '../validators/careManager.validator.js';
import { CareManagerQueryFilter } from '../types/query.types.js';

export class CareManagerService {
  /**
   * List Care Managers with pagination, search, and availability filters
   */
  static async list(query: CareManagerQueryFilter) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const perPage = Math.max(1, parseInt(query.perPage || '10', 10));
    const sort = query.sort || 'createdAt';
    const order = (query.order || 'DESC').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const search = query.q || query.name || query.phone;
    const isAvailableFilter = query.isAvailable !== undefined ? String(query.isAvailable) === 'true' : undefined;

    const where: Prisma.UserWhereInput = {
      role: Role.CARE_MANAGER,
      ...(isAvailableFilter !== undefined
        ? { careManagerProfile: { isAvailable: isAvailableFilter } }
        : {}),
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { email: { contains: search } },
              {
                careManagerProfile: {
                  OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { employeeCode: { contains: search } },
                    { specialization: { contains: search } },
                    { assignedZone: { contains: search } },
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
          careManagerProfile: true,
          _count: {
            select: { casesAsCareManager: true },
          },
        },
      });

    const formattedData = users.map((user) => ({
      id: user.id,
      phone: user.phone,
      email: user.email,
      status: user.status,
      firstName: user.careManagerProfile?.firstName || '',
      lastName: user.careManagerProfile?.lastName || '',
      fullName: `${user.careManagerProfile?.firstName || ''} ${user.careManagerProfile?.lastName || ''}`.trim(),
      employeeCode: user.careManagerProfile?.employeeCode,
      specialization: user.careManagerProfile?.specialization,
      licenseNumber: user.careManagerProfile?.licenseNumber,
      isAvailable: user.careManagerProfile?.isAvailable ?? true,
      assignedZone: user.careManagerProfile?.assignedZone,
      currentLatitude: user.careManagerProfile?.currentLatitude,
      currentLongitude: user.careManagerProfile?.currentLongitude,
      lastLocationUpdate: user.careManagerProfile?.lastLocationUpdate,
      assignedCasesCount: user._count.casesAsCareManager,
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
   * Get single Care Manager by ID
   */
  static async getById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, role: Role.CARE_MANAGER },
      include: {
        careManagerProfile: true,
        casesAsCareManager: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user || !user.careManagerProfile) {
      throw ApiError.notFound('Care Manager record not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      status: user.status,
      firstName: user.careManagerProfile.firstName,
      lastName: user.careManagerProfile.lastName,
      fullName: `${user.careManagerProfile.firstName} ${user.careManagerProfile.lastName}`.trim(),
      employeeCode: user.careManagerProfile.employeeCode,
      specialization: user.careManagerProfile.specialization,
      licenseNumber: user.careManagerProfile.licenseNumber,
      isAvailable: user.careManagerProfile.isAvailable,
      assignedZone: user.careManagerProfile.assignedZone,
      currentLatitude: user.careManagerProfile.currentLatitude,
      currentLongitude: user.careManagerProfile.currentLongitude,
      lastLocationUpdate: user.careManagerProfile.lastLocationUpdate,
      recentCases: user.casesAsCareManager,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Create Care Manager (Transactional User + Profile)
   */
  static async create(input: CreateCareManagerInput) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: input.phone },
    });

    if (existingUser) {
      throw ApiError.conflict('A user with this phone number is already registered');
    }

    const employeeCode = input.employeeCode || `CM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email ? input.email.toLowerCase() : null,
          role: Role.CARE_MANAGER,
          status: UserStatus.ACTIVE,
          isPhoneVerified: true,
        },
      });

      const profile = await tx.careManagerProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          employeeCode,
          specialization: input.specialization,
          licenseNumber: input.licenseNumber,
          isAvailable: input.isAvailable ?? true,
          assignedZone: input.assignedZone,
          currentLatitude: input.currentLatitude,
          currentLongitude: input.currentLongitude,
        },
      });

      return { ...user, careManagerProfile: profile };
    });

    return this.getById(newUser.id);
  }

  /**
   * Update Care Manager details
   */
  static async update(id: string, input: UpdateCareManagerInput) {
    const user = await prisma.user.findFirst({
      where: { id, role: Role.CARE_MANAGER },
      include: { careManagerProfile: true },
    });

    if (!user) {
      throw ApiError.notFound('Care Manager record not found');
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

      await tx.careManagerProfile.update({
        where: { userId: id },
        data: {
          firstName: input.firstName || undefined,
          lastName: input.lastName || undefined,
          employeeCode: input.employeeCode || undefined,
          specialization: input.specialization || undefined,
          licenseNumber: input.licenseNumber || undefined,
          isAvailable: input.isAvailable !== undefined ? input.isAvailable : undefined,
          assignedZone: input.assignedZone || undefined,
          currentLatitude: input.currentLatitude !== undefined ? input.currentLatitude : undefined,
          currentLongitude: input.currentLongitude !== undefined ? input.currentLongitude : undefined,
        },
      });
    });

    return this.getById(id);
  }

  /**
   * Delete Care Manager
   */
  static async delete(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, role: Role.CARE_MANAGER },
    });

    if (!user) {
      throw ApiError.notFound('Care Manager record not found');
    }

    await prisma.user.delete({
      where: { id },
    });

    return { id, message: 'Care Manager removed successfully' };
  }
}
