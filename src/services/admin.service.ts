import bcrypt from 'bcryptjs';
import { Role, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { CreateAdminInput, UpdateAdminStatusInput } from '../validators/admin.validator.js';
import { getPagination, getSort } from '../utils/pagination.js';
import { BasePaginationQuery } from '../types/query.types.js';

/**
 * Shapes an admin User + profile for API responses (never leaks passwordHash).
 */
const serialize = (u: any) => ({
  id: u.id,
  email: u.email,
  status: u.status,
  role: u.role,
  isEmailVerified: u.isEmailVerified,
  firstName: u.adminProfile?.firstName ?? null,
  lastName: u.adminProfile?.lastName ?? null,
  department: u.adminProfile?.department ?? null,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

export class AdminService {
  static async list(query: BasePaginationQuery) {
    const { page, perPage, skip, take } = getPagination(query, 10);
    const { field: sort, order } = getSort(query, ['createdAt', 'email', 'status'], 'createdAt', 'desc');
    const search = query.q || query.name;

    const where: Prisma.UserWhereInput = {
      role: Role.ADMIN,
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              { adminProfile: { is: { firstName: { contains: search } } } },
              { adminProfile: { is: { lastName: { contains: search } } } },
            ],
          }
        : {}),
    };

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: { adminProfile: true },
    });

    return { data: users.map(serialize), total, page, perPage };
  }

  static async getById(id: string) {
    const user = await prisma.user.findFirst({ where: { id, role: Role.ADMIN }, include: { adminProfile: true } });
    if (!user) throw ApiError.notFound('Administrator not found');
    return serialize(user);
  }

  static async create(input: CreateAdminInput) {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, role: Role.ADMIN, status: UserStatus.ACTIVE, isEmailVerified: true },
      });
      await tx.adminProfile.create({
        data: { userId: created.id, firstName: input.firstName, lastName: input.lastName, department: input.department },
      });
      return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: { adminProfile: true } });
    });

    return serialize(user);
  }

  static async updateStatus(id: string, input: UpdateAdminStatusInput, actingAdminId?: string) {
    if (id === actingAdminId && input.status !== UserStatus.ACTIVE) {
      throw ApiError.badRequest('You cannot deactivate your own administrator account');
    }
    const existing = await prisma.user.findFirst({ where: { id, role: Role.ADMIN } });
    if (!existing) throw ApiError.notFound('Administrator not found');

    const user = await prisma.user.update({
      where: { id },
      data: { status: input.status },
      include: { adminProfile: true },
    });
    return serialize(user);
  }
}
