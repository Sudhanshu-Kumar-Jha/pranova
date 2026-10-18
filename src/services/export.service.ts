import * as XLSX from 'xlsx';
import { prisma } from '../utils/prisma.js';
import { ApiError } from '../utils/apiError.js';

export class ExportService {
  /**
   * Export Cases into Excel spreadsheet (.xlsx) buffer
   * Mandatory healthcare requirement: Reason for export must be provided.
   */
  static async exportCasesToExcel(reason: string, actorId?: string, actorEmail?: string) {
    if (!reason || reason.trim().length < 3) {
      throw ApiError.badRequest('A valid "Reason for Export" is mandatory for healthcare compliance auditing');
    }

    const cases = await prisma.case.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          include: { patientProfile: true },
        },
        careManager: {
          include: { careManagerProfile: true },
        },
        provider: true,
      },
    });

    const rows = cases.map((c) => ({
      'Case Number': c.caseNumber,
      'Priority': c.priority,
      'Status': c.status,
      'Case Title': c.title,
      'Trigger Source': c.triggerSource,
      'Patient Name': c.patient.patientProfile
        ? `${c.patient.patientProfile.firstName} ${c.patient.patientProfile.lastName}`.trim()
        : 'Unknown',
      'Patient Phone': c.patient.phone || '—',
      'Blood Group': c.patient.patientProfile?.bloodGroup || '—',
      'Assigned Care Manager': c.careManager?.careManagerProfile
        ? `${c.careManager.careManagerProfile.firstName} ${c.careManager.careManagerProfile.lastName} (${c.careManager.careManagerProfile.employeeCode || 'CM'})`
        : 'Unassigned',
      'Healthcare Provider': c.provider?.name || '—',
      'Incident Address': c.incidentAddress || '—',
      'Incident Latitude': c.incidentLatitude ?? '—',
      'Incident Longitude': c.incidentLongitude ?? '—',
      'Created Timestamp': c.createdAt.toISOString(),
      'Assigned Timestamp': c.assignedAt ? c.assignedAt.toISOString() : '—',
      'Resolved Timestamp': c.resolvedAt ? c.resolvedAt.toISOString() : '—',
      'Audit Export Reason': reason.trim(),
    }));

    // Create Excel Workbook
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Adjust column widths automatically
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 16),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PRANOVA_Cases');

    // Generate binary buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });


    return {
      buffer: excelBuffer,
      rowCount: rows.length,
      filename: `PRANOVA_Cases_Export_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`,
    };
  }
}
