import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const backupPath = path.resolve(process.cwd(), 'backup_pgdata_export.json');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  const backupCounts = backup.counts;

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

  console.log('='.repeat(70));
  console.log(' MODEL-BY-MODEL COUNT VERIFICATION: SOURCE BACKUP VS MYSQL DATABASE');
  console.log('='.repeat(70));

  let totalSource = 0;
  let totalDestination = 0;
  let allMatched = true;

  for (const m of models) {
    const srcCount = backupCounts[m] ?? 0;
    const destCount = await (prisma as any)[m].count();
    totalSource += srcCount;
    totalDestination += destCount;
    const match = srcCount === destCount;
    if (!match) allMatched = false;

    console.log(
      ` ${m.padEnd(20)} | Source: ${String(srcCount).padStart(3)} | MySQL: ${String(destCount).padStart(3)} | ${match ? 'MATCH ✓' : 'MISMATCH ✗'}`
    );
  }

  console.log('='.repeat(70));
  console.log(` TOTAL RECORDS         | Source: ${String(totalSource).padStart(3)} | MySQL: ${String(totalDestination).padStart(3)} | ${allMatched ? 'PERFECT 100% MATCH ✓' : 'MISMATCH ✗'}`);
  console.log('='.repeat(70));

  // Verify foreign key integrity
  console.log('\n--- Referential Integrity Checks ---');
  const usersWithProfiles = await prisma.user.findMany({
    include: {
      adminProfile: true,
      patientProfile: true,
      careManagerProfile: true,
    },
  });
  console.log(`Users checked: ${usersWithProfiles.length}`);
  for (const u of usersWithProfiles) {
    const profile = u.adminProfile || u.patientProfile || u.careManagerProfile;
    console.log(`- User [${u.email}] (${u.role}): profile linked = ${profile ? 'YES (' + profile.firstName + ' ' + profile.lastName + ')' : 'NONE'}`);
  }

  const casesWithTimeline = await prisma.case.findMany({
    include: {
      patient: {
        include: {
          patientProfile: true,
        },
      },
      careManager: true,
      timeline: true,
    },
  });
  console.log(`\nCases checked: ${casesWithTimeline.length}`);
  for (const c of casesWithTimeline) {
    console.log(`- Case ${c.id.substring(0, 8)}... (${c.title}): timeline count = ${c.timeline.length}, patient = ${c.patient?.patientProfile?.firstName || 'N/A'}`);
  }

  if (!allMatched) {
    throw new Error('Integrity mismatch between backup and MySQL');
  }
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
