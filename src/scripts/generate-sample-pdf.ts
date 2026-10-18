import fs from 'fs';
import path from 'path';

export function createValidMinimalPdf(title: string, patientName: string, notes: string): Buffer {
  const cleanTitle = title.replace(/[()\\]/g, '');
  const cleanPatient = patientName.replace(/[()\\]/g, '');
  const cleanNotes = notes.replace(/[()\\]/g, '');
  const dateStr = new Date().toISOString().slice(0, 10);

  const content = [
    'BT',
    '/F1 16 Tf',
    '50 750 Td',
    `(${cleanTitle}) Tj`,
    '/F1 11 Tf',
    '0 -30 Td',
    `(Patient Name: ${cleanPatient}) Tj`,
    '0 -20 Td',
    `(Record Date: ${dateStr}) Tj`,
    '0 -20 Td',
    '(Status: VERIFIED CLINICAL RECORD) Tj',
    '0 -40 Td',
    '/F1 13 Tf',
    '(Diagnostic Findings & Clinical Notes:) Tj',
    '/F1 10 Tf',
    '0 -25 Td',
    `(${cleanNotes}) Tj`,
    '0 -50 Td',
    '/F1 9 Tf',
    '(Certified by PRANOVA Clinical Diagnostic Systems - DPDP & HIPAA Compliant) Tj',
    'ET',
  ].join('\n');

  const streamLen = Buffer.byteLength(content, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const xref: number[] = [0];
  for (const obj of objects) {
    xref.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const startxref = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    pdf += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

export function ensureSampleDocumentsExist(): void {
  const dir = path.resolve(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const samplePdf = createValidMinimalPdf(
    'PRANOVA Healthcare - Emergency Cardiac & Blood Chemistry Lab Report',
    'Aarav Sharma (Male, 48 Yrs | Blood Group: B+)',
    'Troponin-T elevated: 0.08 ng/mL (Ref: < 0.014). CPK-MB: 24 U/L. Urgent Cardiology Consult Initiated.'
  );

  const targets = [
    path.join(dir, 'sample_cardiac_report.pdf'),
    path.join(dir, 'ead788bd-5196-4d8f-8995-2da59577eca4.pdf'),
    path.join(dir, 'lab_sample_01.pdf'),
  ];

  for (const target of targets) {
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, samplePdf);
    }
  }
}

// When run directly as a script
if (process.argv[1]?.includes('generate-sample-pdf')) {
  ensureSampleDocumentsExist();
  console.log('[ASSETS] Sample clinical PDF documents verified in uploads/documents');
}
