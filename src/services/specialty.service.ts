import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { CreateSpecialtyInput, UpdateSpecialtyInput } from '../validators/specialty.validator.js';
import { SpecialtyQueryFilter } from '../types/query.types.js';
import { getPagination, getSort } from '../utils/pagination.js';

export class SpecialtyService {
  static async list(query: SpecialtyQueryFilter) {
    const { page, perPage, skip, take } = getPagination(query, 50);
    const { field: sort, order } = getSort(query, ['name', 'createdAt', 'updatedAt'], 'name', 'asc');
    const search = query.q || query.name;

    const where: Prisma.SpecialtyWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const total = await prisma.specialty.count({ where });
    const specialties = await prisma.specialty.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: { _count: { select: { doctors: true } } },
    });

    return {
      data: specialties.map((s) => ({ ...s, doctorsCount: s._count.doctors })),
      total,
      page,
      perPage,
    };
  }

  static async getById(id: string) {
    const specialty = await prisma.specialty.findUnique({
      where: { id },
      include: { _count: { select: { doctors: true } } },
    });
    if (!specialty) throw ApiError.notFound('Specialty not found');
    return { ...specialty, doctorsCount: specialty._count.doctors };
  }

  static async create(input: CreateSpecialtyInput) {
    return prisma.specialty.create({
      data: {
        name: input.name,
        description: input.description,
        iconKey: input.iconKey,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async update(id: string, input: UpdateSpecialtyInput) {
    const existing = await prisma.specialty.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Specialty not found');
    return prisma.specialty.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        iconKey: input.iconKey,
        isActive: input.isActive,
      },
    });
  }

  static async delete(id: string) {
    const existing = await prisma.specialty.findUnique({
      where: { id },
      include: { _count: { select: { doctors: true } } },
    });
    if (!existing) throw ApiError.notFound('Specialty not found');
    if (existing._count.doctors > 0) {
      throw ApiError.badRequest('Cannot delete a specialty that still has doctors assigned to it');
    }
    await prisma.specialty.delete({ where: { id } });
    return { id, message: 'Specialty removed successfully' };
  }
}
