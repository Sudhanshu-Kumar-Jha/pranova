import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const models = [
    'user',
    'adminProfile',
    'patientProfile',
    'careManagerProfile',
    'familyMember',
    'consent',
    'provider',
    'case',
    'caseTimeline',
    'setting',
    'specialty',
    'doctor',
    'doctorSlot',
    'appointment',
    'medicine',
    'medicineOrder',
    'orderItem',
    'diagnosticTest',
    'labBooking',
  ];

  const backupData: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  console.log('--- Current Database Table Inspection ---');
  for (const m of models) {
    try {
      const records = await (prisma as any)[m].findMany();
      backupData[m] = records;
      counts[m] = records.length;
      console.log(`${m}: ${records.length} records`);
    } catch (e: any) {
      console.error(`Error querying ${m}:`, e.message);
    }
  }

  const backupPath = path.resolve(process.cwd(), 'backup_pgdata_export.json');
  fs.writeFileSync(backupPath, JSON.stringify({ exportedAt: new Date().toISOString(), counts, data: backupData }, null, 2), 'utf-8');
  console.log(`\nSuccessfully exported all data to ${backupPath}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
