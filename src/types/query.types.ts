import {
  Role,
  ProviderType,
  ProviderStatus,
  CasePriority,
  CaseStatus,
  DoctorStatus,
  AppointmentType,
  AppointmentStatus,
  MedicineCategory,
  OrderStatus,
  LabBookingStatus,
} from '@prisma/client';

export interface BasePaginationQuery {
  page?: string;
  perPage?: string;
  sort?: string;
  order?: 'asc' | 'desc' | 'ASC' | 'DESC';
  q?: string;
  name?: string;
  phone?: string;
}

export interface PatientQueryFilter extends BasePaginationQuery {
  bloodGroup?: string;
  gender?: string;
}

export interface CareManagerQueryFilter extends BasePaginationQuery {
  isAvailable?: string | boolean;
  operationalZone?: string;
}

export interface ProviderQueryFilter extends BasePaginationQuery {
  type?: ProviderType;
  status?: ProviderStatus;
  city?: string;
}

export interface CaseQueryFilter extends BasePaginationQuery {
  caseNumber?: string;
  title?: string;
  priority?: CasePriority;
  status?: CaseStatus;
  careManagerId?: string;
  patientId?: string;
}

export interface SpecialtyQueryFilter extends BasePaginationQuery {
  isActive?: string;
}

export interface DoctorQueryFilter extends BasePaginationQuery {
  specialtyId?: string;
  providerId?: string;
  city?: string;
  status?: DoctorStatus;
  isVideoEnabled?: string;
}

export interface AppointmentQueryFilter extends BasePaginationQuery {
  doctorId?: string;
  patientId?: string;
  type?: AppointmentType;
  status?: AppointmentStatus;
}

export interface MedicineQueryFilter extends BasePaginationQuery {
  category?: MedicineCategory;
  requiresPrescription?: string;
  isActive?: string;
}

export interface OrderQueryFilter extends BasePaginationQuery {
  patientId?: string;
  status?: OrderStatus;
}

export interface DiagnosticTestQueryFilter extends BasePaginationQuery {
  category?: string;
  providerId?: string;
  isActive?: string;
}

export interface LabBookingQueryFilter extends BasePaginationQuery {
  patientId?: string;
  testId?: string;
  status?: LabBookingStatus;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}
