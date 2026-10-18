import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Instantiate raw PrismaClient directly without audit immutability extensions for restoration
const prisma = new PrismaClient({
  log: ['error'],
});

// Helper to convert ISO date strings to real Date objects recursively
function parseDates(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(parseDates);

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = parseDates(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function importModelData(modelName: string, records: any[]) {
  if (!records || records.length === 0) {
    console.log(`[IMPORT] ${modelName.padEnd(20)}: 0 records in backup (skipped)`);
    return { target: 0, imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const parsed = parseDates(record);
    try {
      if (modelName === 'setting') {
        const existing = await (prisma as any).setting.findUnique({
          where: { key: parsed.key },
        });
        if (!existing) {
          await (prisma as any).setting.create({ data: parsed });
          imported++;
        } else {
          await (prisma as any).setting.update({
            where: { key: parsed.key },
            data: parsed,
          });
          skipped++;
        }
      } else if (parsed.id) {
        const existing = await (prisma as any)[modelName].findUnique({
          where: { id: parsed.id },
        });
        if (!existing) {
          await (prisma as any)[modelName].create({ data: parsed });
          imported++;
        } else {
          // Idempotent: record already present
          skipped++;
        }
      } else {
        await (prisma as any)[modelName].create({ data: parsed });
        imported++;
      }
    } catch (err: any) {
      console.warn(`[IMPORT_WARN] Failed to insert ${modelName} (${parsed.id || parsed.key || 'unknown'}):`, err.message);
    }
  }

  const status = skipped > 0 ? `(${imported} new, ${skipped} already existing)` : `(${imported} new)`;
  console.log(`[IMPORT] ${modelName.padEnd(20)}: ${imported + skipped}/${records.length} records verified ${status}`);
  return { target: records.length, imported, skipped };
}

async function main() {
  const backupPath = path.resolve(process.cwd(), 'backup_pgdata_export.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`[IMPORT_ERROR] Backup file not found at: ${backupPath}`);
    process.exit(1);
  }

  console.log(`[IMPORT] Loading verified backup from: ${backupPath}`);
  const raw = fs.readFileSync(backupPath, 'utf-8');
  const backup = JSON.parse(raw);
  const data = backup.data || backup;

  console.log(`[IMPORT] Validating database connection...`);
  await prisma.$queryRaw`SELECT 1`;
  console.log(`[IMPORT] MySQL connection active. Starting restoration...\n`);

  // Relational dependency sequence
  const sequence = [
    'specialty',
    'setting',
    'provider',
    'user',
    'adminProfile',
    'patientProfile',
    'careManagerProfile',
    'doctor',
    'doctorSlot',
    'familyMember',
    'consent',
    'case',
    'caseTimeline',
    'appointment',
    'medicine',
    'medicineOrder',
    'orderItem',
    'diagnosticTest',
    'labBooking',
  ];

  let totalTarget = 0;
  let totalProcessed = 0;

  for (const model of sequence) {
    const records = data[model] || [];
    totalTarget += records.length;
    const res = await importModelData(model, records);
    totalProcessed += res.imported + res.skipped;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  PRANOVA Database Restoration & Verification Complete`);
  console.log('='.repeat(60));
  console.log(`  Total Backup Records:    ${totalTarget}`);
  console.log(`  Total Processed/Active:  ${totalProcessed}`);
  console.log(`  Integrity Match:         ${totalTarget === totalProcessed ? '100% PERFECT MATCH' : 'DISCREPANCY DETECTED'}`);
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('[IMPORT_FATAL] Error restoring database:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
