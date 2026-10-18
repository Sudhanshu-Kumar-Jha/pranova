import { LabBookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { generateReference } from '../utils/reference.js';
import {
  CreateTestInput,
  UpdateTestInput,
  BookLabTestInput,
  UpdateLabBookingStatusInput,
} from '../validators/diagnostic.validator.js';
import { DiagnosticTestQueryFilter, LabBookingQueryFilter } from '../types/query.types.js';
import { getPagination, getSort } from '../utils/pagination.js';

const bookingInclude = {
  test: { select: { id: true, name: true, category: true, reportTimeHours: true } },
  patient: { select: { id: true, email: true, phone: true } },
} satisfies Prisma.LabBookingInclude;

const LAB_FLOW: Record<LabBookingStatus, LabBookingStatus[]> = {
  BOOKED: [LabBookingStatus.SAMPLE_COLLECTED, LabBookingStatus.CANCELLED],
  SAMPLE_COLLECTED: [LabBookingStatus.PROCESSING, LabBookingStatus.CANCELLED],
  PROCESSING: [LabBookingStatus.REPORT_READY, LabBookingStatus.CANCELLED],
  REPORT_READY: [],
  CANCELLED: [],
};

export class DiagnosticService {
  // ---------------- Diagnostic Test Catalog ----------------

  static async listTests(query: DiagnosticTestQueryFilter, activeOnly = false) {
    const { page, perPage, skip, take } = getPagination(query, 12);
    const { field: sort, order } = getSort(
      query,
      ['name', 'sellingPrice', 'mrp', 'reportTimeHours', 'createdAt'],
      'name',
      'asc'
    );
    const search = query.q || query.name;

    const where: Prisma.DiagnosticTestWhereInput = {
      ...(activeOnly ? { isActive: true } : query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.category ? { category: { contains: query.category } } : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    };

    const total = await prisma.diagnosticTest.count({ where });
    const tests = await prisma.diagnosticTest.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: { provider: { select: { id: true, name: true, city: true } } },
    });

    return { data: tests, total, page, perPage };
  }

  static async getTestById(id: string) {
    const test = await prisma.diagnosticTest.findUnique({
      where: { id },
      include: { provider: { select: { id: true, name: true, city: true } } },
    });
    if (!test) throw ApiError.notFound('Diagnostic test not found');
    return test;
  }

  static async createTest(input: CreateTestInput) {
    return prisma.diagnosticTest.create({
      data: {
        name: input.name,
        code: input.code,
        category: input.category,
        description: input.description,
        sampleType: input.sampleType,
        preparation: input.preparation,
        mrp: input.mrp,
        sellingPrice: input.sellingPrice,
        reportTimeHours: input.reportTimeHours ?? 24,
        homeCollectionAvailable: input.homeCollectionAvailable ?? true,
        providerId: input.providerId ?? null,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async updateTest(id: string, input: UpdateTestInput) {
    const existing = await prisma.diagnosticTest.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Diagnostic test not found');
    return prisma.diagnosticTest.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        category: input.category,
        description: input.description,
        sampleType: input.sampleType,
        preparation: input.preparation,
        mrp: input.mrp,
        sellingPrice: input.sellingPrice,
        reportTimeHours: input.reportTimeHours,
        homeCollectionAvailable: input.homeCollectionAvailable,
        providerId: input.providerId,
        isActive: input.isActive,
      },
    });
  }

  static async deleteTest(id: string) {
    const existing = await prisma.diagnosticTest.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!existing) throw ApiError.notFound('Diagnostic test not found');
    if (existing._count.bookings > 0) {
      throw ApiError.badRequest('Cannot delete a test with existing bookings. Set isActive to false instead.');
    }
    await prisma.diagnosticTest.delete({ where: { id } });
    return { id, message: 'Diagnostic test removed successfully' };
  }

  // ---------------- Lab Bookings ----------------

  static async listBookings(query: LabBookingQueryFilter) {
    const { page, perPage, skip, take } = getPagination(query, 10);
    const { field: sort, order } = getSort(
      query,
      ['scheduledDate', 'createdAt', 'status', 'amount'],
      'scheduledDate',
      'desc'
    );

    const where: Prisma.LabBookingWhereInput = {
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.testId ? { testId: query.testId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const total = await prisma.labBooking.count({ where });
    const bookings = await prisma.labBooking.findMany({
      where,
      skip,
      take,
      orderBy: { [sort]: order },
      include: bookingInclude,
    });

    return { data: bookings, total, page, perPage };
  }

  static async getBookingById(id: string, patientId?: string) {
    const booking = await prisma.labBooking.findUnique({ where: { id }, include: bookingInclude });
    if (!booking) throw ApiError.notFound('Lab booking not found');
    if (patientId && booking.patientId !== patientId) {
      throw ApiError.forbidden('You can only access your own lab bookings');
    }
    return booking;
  }

  static async book(patientId: string, input: BookLabTestInput) {
    const test = await prisma.diagnosticTest.findUnique({ where: { id: input.testId } });
    if (!test) throw ApiError.badRequest('The supplied testId does not exist');
    if (!test.isActive) throw ApiError.badRequest('This diagnostic test is currently unavailable');
    if (input.scheduledDate.getTime() < Date.now()) {
      throw ApiError.badRequest('scheduledDate must be in the future');
    }

    return prisma.labBooking.create({
      data: {
        bookingNumber: generateReference('LAB'),
        patientId,
        testId: test.id,
        status: LabBookingStatus.BOOKED,
        collectionType: input.collectionType,
        scheduledDate: input.scheduledDate,
        address: input.address,
        city: input.city,
        pincode: input.pincode,
        phone: input.phone,
        amount: test.sellingPrice,
        paymentStatus: PaymentStatus.PENDING,
      },
      include: bookingInclude,
    });
  }

  static async updateBookingStatus(id: string, input: UpdateLabBookingStatusInput) {
    const existing = await prisma.labBooking.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Lab booking not found');
    const allowed = LAB_FLOW[existing.status];
    if (!allowed.includes(input.status)) {
      throw ApiError.badRequest(`Cannot transition booking from ${existing.status} to ${input.status}`);
    }
    return prisma.labBooking.update({
      where: { id },
      data: {
        status: input.status,
        reportUrl: input.reportUrl ?? undefined,
        paymentStatus: input.status === LabBookingStatus.REPORT_READY ? PaymentStatus.PAID : undefined,
      },
      include: bookingInclude,
    });
  }

  static async listBookingsForPatient(patientId: string, query: LabBookingQueryFilter) {
    return this.listBookings({ ...query, patientId });
  }
}
