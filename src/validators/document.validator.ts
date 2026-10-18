import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  title: z.string().min(2, 'Document title is required').max(150),
  documentType: z.enum([
    'PRESCRIPTION',
    'LAB_REPORT',
    'DISCHARGE_SUMMARY',
    'INSURANCE_POLICY',
    'VACCINATION_RECORD',
    'OTHER',
  ]).default('PRESCRIPTION'),
  mimeType: z.string().default('application/pdf'),
  fileSize: z.number().int().nonnegative().default(1024),
  fileUrl: z.string().default(''),
  filePath: z.string().optional(),
  caseId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  base64Data: z.string().optional(),
  fileName: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
