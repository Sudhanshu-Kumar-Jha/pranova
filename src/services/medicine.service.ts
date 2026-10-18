import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { CreateMedicineInput, UpdateMedicineInput } from '../validators/medicine.validator.js';
import { MedicineQueryFilter } from '../types/query.types.js';
import { getPagination, getSort } from '../utils/pagination.js';

export class MedicineService {
  static async list(query: MedicineQueryFilter, activeOnly = false) {
    const { page, perPage, skip, take } = getPagination(query, 12);
    const { field: sort, order } = getSort(
      query,
      ['name', 'sellingPrice', 'mrp', 'stock', 'createdAt'],
      'name',
      'asc'
    );
    const search = query.q || query.name;

    const where: Prisma.MedicineWhereInput = {
      ...(activeOnly ? { isActive: true } : query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.requiresPrescription !== undefined
        ? { requiresPrescription: query.requiresPrescription === 'true' }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { contains: search } },
              { manufacturer: { contains: search } },
            ],
          }
        : {}),
    };

    const total = await prisma.medicine.count({ where });
    const medicines = await prisma.medicine.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
    });

    return { data: medicines, total, page, perPage };
  }

  static async getById(id: string) {
    const medicine = await prisma.medicine.findUnique({ where: { id } });
    if (!medicine) throw ApiError.notFound('Medicine not found');
    return medicine;
  }

  static async create(input: CreateMedicineInput) {
    return prisma.medicine.create({
      data: {
        name: input.name,
        brand: input.brand,
        manufacturer: input.manufacturer,
        category: input.category,
        form: input.form,
        packSize: input.packSize,
        description: input.description,
        mrp: input.mrp,
        sellingPrice: input.sellingPrice,
        stock: input.stock ?? 0,
        requiresPrescription: input.requiresPrescription ?? false,
        imageUrl: input.imageUrl,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async update(id: string, input: UpdateMedicineInput) {
    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Medicine not found');
    return prisma.medicine.update({
      where: { id },
      data: {
        name: input.name,
        brand: input.brand,
        manufacturer: input.manufacturer,
        category: input.category,
        form: input.form,
        packSize: input.packSize,
        description: input.description,
        mrp: input.mrp,
        sellingPrice: input.sellingPrice,
        stock: input.stock,
        requiresPrescription: input.requiresPrescription,
        imageUrl: input.imageUrl,
        isActive: input.isActive,
      },
    });
  }

  static async delete(id: string) {
    const existing = await prisma.medicine.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!existing) throw ApiError.notFound('Medicine not found');
    if (existing._count.orderItems > 0) {
      throw ApiError.badRequest('Cannot delete a medicine referenced by existing orders. Set isActive to false instead.');
    }
    await prisma.medicine.delete({ where: { id } });
    return { id, message: 'Medicine removed successfully' };
  }
}
