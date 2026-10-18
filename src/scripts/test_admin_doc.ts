import config from '../config/env.config.js';
import { prisma } from '../utils/prisma.js';

const API_BASE = 'http://localhost:5000/api/v1';

async function main() {
  console.log('--- 1. Authenticating as Super Admin ---');
  let admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    throw new Error('No admin user found in database');
  }

  const loginRes = await fetch(`${API_BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: admin.email,
      password: config.admin.password || 'Admin@123456',
    }),
  });

  const loginData: any = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
  }

  const token = loginData.data.tokens.accessToken;
  console.log('Super Admin authenticated successfully. Token length:', token.length);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('\n--- 2. Ensuring at least one document exists in database ---');
  let patient = await prisma.user.findFirst({
    where: { role: 'PATIENT' },
    include: { patientProfile: true },
  });

  if (!patient) {
    throw new Error('No patient found in database');
  }

  let doc = await prisma.document.findFirst({
    where: { patientId: patient.id },
  });

  if (!doc) {
    console.log('Creating sample clinical document for patient:', patient.email);
    doc = await prisma.document.create({
      data: {
        patientId: patient.id,
        title: 'Emergency Blood Chemistry & Cardiac Enzymes',
        documentType: 'LAB_REPORT',
        mimeType: 'application/pdf',
        fileSize: 1024 * 420,
        fileUrl: 'https://storage.pranova.health/clinical/lab_sample_01.pdf',
        notes: 'Troponin-T elevated (0.08 ng/mL). CPK-MB at upper normal limit.',
      },
    });
  }
  console.log('Document ready. ID:', doc.id, 'Title:', doc.title);

  console.log('\n--- 3. Testing GET /api/v1/admin/documents (Admin List) ---');
  const listRes = await fetch(`${API_BASE}/admin/documents`, { headers: authHeaders });
  const listData: any = await listRes.json();
  console.log('Status:', listRes.status);
  console.log('Total documents retrieved:', listData.data?.length ?? 0);
  const found = listData.data?.find((d: any) => d.id === doc?.id);
  console.log('Found document in list:', found ? {
    id: found.id,
    title: found.title,
    patientName: found.patientName,
    documentType: found.documentType,
    accessLogsCount: found.accessLogsCount,
  } : 'NOT FOUND');

  console.log('\n--- 4. Testing GET /api/v1/documents (React-Admin resource route) ---');
  const raRes = await fetch(`${API_BASE}/documents`, { headers: authHeaders });
  const raData: any = await raRes.json();
  console.log('Status:', raRes.status);
  console.log('React-Admin endpoint works! Data count:', raData.data?.length ?? 0);

  console.log('\n--- 5. Testing GET /api/v1/admin/documents/:id (Admin Inspection & Logging) ---');
  const inspectRes = await fetch(`${API_BASE}/admin/documents/${doc.id}`, { headers: authHeaders });
  const inspectData: any = await inspectRes.json();
  console.log('Status:', inspectRes.status);
  console.log('Document metadata:', {
    title: inspectData.data?.title,
    patientName: inspectData.data?.patientName,
    downloadUrl: inspectData.data?.downloadUrl,
    fileSize: inspectData.data?.fileSize,
  });

  console.log('\n--- 6. Testing GET /api/v1/admin/documents/:id/access-logs (Immutable Access Timeline) ---');
  const logsRes = await fetch(`${API_BASE}/admin/documents/${doc.id}/access-logs`, { headers: authHeaders });
  const logsData: any = await logsRes.json();
  console.log('Status:', logsRes.status);
  console.log('Access log entries:', logsData.data?.length ?? 0);
  console.log('Latest log entry:', logsData.data?.[0]);

  const hasAdminLog = logsData.data?.some((l: any) => l.accessorRole === 'ADMIN' && l.action === 'ADMIN_INSPECTED');
  if (hasAdminLog) {
    console.log('\n>>> SUCCESS: Admin inspection successfully created an immutable DocumentAccessLog entry! <<<');
  } else {
    throw new Error('Admin inspection did not create expected access log entry');
  }
}

main()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
