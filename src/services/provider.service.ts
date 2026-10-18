import { ProviderType, ProviderStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import {
  CreateProviderInput,
  UpdateProviderInput,
  UpdateProviderStatusInput,
} from '../validators/provider.validator.js';
import { ProviderQueryFilter } from '../types/query.types.js';

export class ProviderService {
  /**
   * List Providers with pagination, filtering by type/status, and search
   */
  static async list(query: ProviderQueryFilter) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const perPage = Math.max(1, parseInt(query.perPage || '10', 10));
    const sort = query.sort || 'createdAt';
    const order = (query.order || 'DESC').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const search = query.q || query.name;
    const typeFilter = query.type as ProviderType | undefined;
    const statusFilter = query.status as ProviderStatus | undefined;

    const where: Prisma.ProviderWhereInput = {
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { city: { contains: search } },
              { phone: { contains: search } },
              { contactPerson: { contains: search } },
            ],
          }
        : {}),
    };

    const total = await prisma.provider.count({ where });
    const providers = await prisma.provider.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { [sort]: order },
        include: {
          _count: {
            select: { cases: true, consents: true },
          },
        },
      });

    const formattedData = providers.map((p) => ({
      ...p,
      casesCount: p._count.cases,
      consentsCount: p._count.consents,
    }));

    return {
      data: formattedData,
      total,
      page,
      perPage,
    };
  }

  /**
   * Get single Provider by ID
   */
  static async getById(id: string) {
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        cases: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { cases: true, consents: true },
        },
      },
    });

    if (!provider) {
      throw ApiError.notFound('Healthcare provider not found');
    }

    return {
      ...provider,
      casesCount: provider._count.cases,
      consentsCount: provider._count.consents,
    };
  }

  /**
   * Create new Healthcare Provider
   */
  static async create(input: CreateProviderInput) {
    const provider = await prisma.provider.create({
      data: {
        name: input.name,
        type: input.type,
        status: input.status || ProviderStatus.ACTIVE,
        licenseNumber: input.licenseNumber,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email ? input.email.toLowerCase() : null,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        operatingHours: input.operatingHours,
        rating: input.rating ?? 0,
      },
    });

    return provider;
  }

  /**
   * Update Provider details
   */
  static async update(id: string, input: UpdateProviderInput) {
    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Healthcare provider not found');
    }

    const updated = await prisma.provider.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        status: input.status,
        licenseNumber: input.licenseNumber,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email ? input.email.toLowerCase() : undefined,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        operatingHours: input.operatingHours,
        rating: input.rating,
      },
    });

    return updated;
  }

  /**
   * Transition Provider Status (ACTIVE, PAUSED, DEACTIVATED)
   */
  static async updateStatus(id: string, input: UpdateProviderStatusInput) {
    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Healthcare provider not found');
    }

    const updated = await prisma.provider.update({
      where: { id },
      data: { status: input.status },
    });

    return updated;
  }

  /**
   * Delete Provider
   */
  static async delete(id: string) {
    const existing = await prisma.provider.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Healthcare provider not found');
    }

    await prisma.provider.delete({
      where: { id },
    });

    return { id, message: 'Provider removed successfully' };
  }
}
