import {
  PrismaClient,
  Role,
  UserStatus,
  ProviderType,
  ProviderStatus,
  CasePriority,
  CaseStatus,
  CaseTriggerSource,
  DoctorStatus,
  AppointmentType,
  AppointmentStatus,
  MedicineCategory,
  SampleCollectionType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import '../src/config/env.config.js';
import { appUrl } from '../src/utils/url.js';
import { ensureSampleDocumentsExist } from '../src/scripts/generate-sample-pdf.js';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting PRANOVA database seed...');

  // 1. Seed System Admin (Configured via .env Admin Credentials)
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pranova.com').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || 'Admin@123456').trim();
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Super';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'Admin';
  const adminDepartment = process.env.ADMIN_DEPARTMENT || 'Operations';

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: { adminProfile: true },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        adminProfile: {
          create: {
            firstName: adminFirstName,
            lastName: adminLastName,
            department: adminDepartment,
            mfaEnabled: false,
          },
        },
      },
      include: { adminProfile: true },
    });
    console.log(`[SEED] Created default Admin from .env: ${adminUser.email}`);
  } else {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        adminProfile: {
          upsert: {
            create: {
              firstName: adminFirstName,
              lastName: adminLastName,
              department: adminDepartment,
              mfaEnabled: false,
            },
            update: {
              firstName: adminFirstName,
              lastName: adminLastName,
              department: adminDepartment,
            },
          },
        },
      },
      include: { adminProfile: true },
    });
    console.log(`[SEED] Updated default Admin from .env: ${adminEmail}`);
  }

  // 2. Seed Sample Care Manager
  const cmPhone = '+919876543210';
  let careManagerUser = await prisma.user.findUnique({
    where: { phone: cmPhone },
  });

  if (!careManagerUser) {
    careManagerUser = await prisma.user.create({
      data: {
        phone: cmPhone,
        role: Role.CARE_MANAGER,
        status: UserStatus.ACTIVE,
        isPhoneVerified: true,
        careManagerProfile: {
          create: {
            firstName: 'Rahul',
            lastName: 'Sharma',
            employeeCode: 'CM-1001',
            specialization: 'Emergency Response & Cardiac Triage',
            isAvailable: true,
            currentLatitude: 12.9716,
            currentLongitude: 77.5946,
            assignedZone: 'Central Bengaluru',
          },
        },
      },
    });
    console.log(`[SEED] Created sample Care Manager: ${careManagerUser.phone}`);
  }

  // 3. Seed Sample Patient
  const patientPhone = '+919123456789';
  let patientUser = await prisma.user.findUnique({
    where: { phone: patientPhone },
  });

  if (!patientUser) {
    patientUser = await prisma.user.create({
      data: {
        phone: patientPhone,
        role: Role.PATIENT,
        status: UserStatus.ACTIVE,
        isPhoneVerified: true,
        patientProfile: {
          create: {
            firstName: 'Ananya',
            lastName: 'Iyer',
            gender: 'Female',
            bloodGroup: 'B+',
            primaryAddress: '104, Indiranagar 100ft Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560038',
            latitude: 12.9784,
            longitude: 77.6408,
            emergencyContactName: 'Vikram Iyer',
            emergencyContactPhone: '+919876543211',
          },
        },
      },
    });
    console.log(`[SEED] Created sample Patient: ${patientUser.phone}`);
  }

  // 4. Seed Sample Providers (Hospitals & Diagnostics)
  let hospital = await prisma.provider.findFirst({
    where: { name: 'Apollo Multispeciality Hospital' },
  });

  if (!hospital) {
    hospital = await prisma.provider.create({
      data: {
        name: 'Apollo Multispeciality Hospital',
        type: ProviderType.HOSPITAL,
        status: ProviderStatus.ACTIVE,
        licenseNumber: 'HOSP-BLR-2024-099',
        contactPerson: 'Dr. Ramesh Kumar',
        phone: '+918022223333',
        email: 'emergency@apolloblr.org',
        address: '154/11 Bannerghatta Main Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560076',
        latitude: 12.8988,
        longitude: 77.5985,
        rating: 4.8,
      },
    });
    console.log('[SEED] Created sample Hospital Provider: Apollo Multispeciality Hospital');
  }

  // 5. Seed Initial Coordination Case
  const existingCase = await prisma.case.findFirst({
    where: { caseNumber: 'PRN-2026-1001' },
  });

  if (!existingCase && patientUser) {
    const initialCase = await prisma.case.create({
      data: {
        caseNumber: 'PRN-2026-1001',
        patientId: patientUser.id,
        providerId: hospital?.id,
        priority: CasePriority.P1,
        status: CaseStatus.OPEN,
        title: 'Acute Chest Discomfort - Cardiac Dispatch Required',
        description: 'Patient triggered SOS alert with severe chest pain symptoms. Requires immediate field evaluation and hospital bed reservation.',
        triggerSource: CaseTriggerSource.SOS_BUTTON,
        incidentAddress: '104, Indiranagar 100ft Road, Bengaluru',
        incidentLatitude: 12.9784,
        incidentLongitude: 77.6408,
        timeline: {
          create: {
            action: 'CASE_CREATED',
            newStatus: CaseStatus.OPEN,
            actorId: patientUser.id,
            actorRole: Role.PATIENT,
            notes: 'Emergency SOS button triggered from mobile application. Immediate triage required.',
          },
        },
      },
    });
    console.log(`[SEED] Created sample Case: ${initialCase.caseNumber} (Priority: P1)`);
  }

  // ----------------------------------------------------------------
  // PRACTO-STYLE CONSUMER PLATFORM SEED
  // (Specialties, Doctors, Pharmacy, Diagnostics + sample bookings)
  // ----------------------------------------------------------------

  // 6. Lab provider for diagnostics
  let lab = await prisma.provider.findFirst({ where: { name: 'PRANOVA Diagnostics Lab' } });
  if (!lab) {
    lab = await prisma.provider.create({
      data: {
        name: 'PRANOVA Diagnostics Lab',
        type: ProviderType.LAB,
        status: ProviderStatus.ACTIVE,
        phone: '+918044445555',
        email: 'lab@pranova.health',
        address: '45, Residency Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560025',
        rating: 4.6,
      },
    });
    console.log('[SEED] Created Lab Provider: PRANOVA Diagnostics Lab');
  }

  // 7. Specialties
  const specialtyDefs = [
    { name: 'General Physician', iconKey: 'stethoscope', description: 'Everyday health concerns, fever, infections' },
    { name: 'Cardiology', iconKey: 'heart', description: 'Heart & cardiovascular care' },
    { name: 'Dermatology', iconKey: 'skin', description: 'Skin, hair and nail conditions' },
    { name: 'Pediatrics', iconKey: 'baby', description: 'Child health and development' },
    { name: 'Gynecology', iconKey: 'female', description: "Women's health and reproductive care" },
  ];
  const specialties: Record<string, string> = {};
  for (const def of specialtyDefs) {
    const existing = await prisma.specialty.findUnique({ where: { name: def.name } });
    const s = existing ?? (await prisma.specialty.create({ data: def }));
    specialties[def.name] = s.id;
  }
  console.log(`[SEED] Ensured ${specialtyDefs.length} specialties`);

  // 8. Doctors
  const doctorDefs = [
    {
      firstName: 'Asha', lastName: 'Menon', specialty: 'Cardiology', gender: 'Female',
      qualifications: 'MBBS, MD (Cardiology), DM', experienceYears: 14,
      languages: 'English, Hindi, Malayalam', consultationFeeVideo: 599, consultationFeeAudio: 399, consultationFeeClinic: 799,
      registrationNumber: 'KMC-2011-55421', rating: 4.9,
      bio: 'Senior interventional cardiologist with 14 years of experience.',
    },
    {
      firstName: 'Rohan', lastName: 'Gupta', specialty: 'General Physician', gender: 'Male',
      qualifications: 'MBBS, MD (Internal Medicine)', experienceYears: 9,
      languages: 'English, Hindi', consultationFeeVideo: 399, consultationFeeAudio: 299, consultationFeeClinic: 499,
      registrationNumber: 'DMC-2015-11234', rating: 4.7,
      bio: 'General physician focused on preventive and primary care.',
    },
    {
      firstName: 'Neha', lastName: 'Rao', specialty: 'Dermatology', gender: 'Female',
      qualifications: 'MBBS, MD (Dermatology)', experienceYears: 7,
      languages: 'English, Kannada', consultationFeeVideo: 499, consultationFeeAudio: 349, consultationFeeClinic: 699,
      registrationNumber: 'KMC-2017-77810', rating: 4.8,
      bio: 'Clinical and cosmetic dermatologist.',
    },
    {
      firstName: 'Sameer', lastName: 'Khan', specialty: 'Pediatrics', gender: 'Male',
      qualifications: 'MBBS, DCH, MD (Pediatrics)', experienceYears: 11,
      languages: 'English, Hindi, Urdu', consultationFeeVideo: 449, consultationFeeAudio: 299, consultationFeeClinic: 599,
      registrationNumber: 'MMC-2013-33190', rating: 4.9,
      bio: 'Pediatrician with a special interest in neonatal care.',
    },
  ];
  let firstDoctorId: string | null = null;
  for (const def of doctorDefs) {
    const existing = await prisma.doctor.findFirst({
      where: { firstName: def.firstName, lastName: def.lastName, specialtyId: specialties[def.specialty] },
    });
    const doctor =
      existing ??
      (await prisma.doctor.create({
        data: {
          specialtyId: specialties[def.specialty],
          providerId: hospital?.id ?? null,
          firstName: def.firstName,
          lastName: def.lastName,
          gender: def.gender,
          qualifications: def.qualifications,
          experienceYears: def.experienceYears,
          languages: def.languages,
          consultationFeeVideo: def.consultationFeeVideo,
          consultationFeeAudio: def.consultationFeeAudio,
          consultationFeeClinic: def.consultationFeeClinic,
          registrationNumber: def.registrationNumber,
          rating: def.rating,
          bio: def.bio,
          city: 'Bengaluru',
          clinicAddress: 'Apollo Multispeciality Hospital, Bannerghatta Road',
          isVideoEnabled: true,
          isAudioEnabled: true,
          status: DoctorStatus.ACTIVE,
          slots: {
            create: [
              { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', type: AppointmentType.VIDEO },
              { dayOfWeek: 3, startTime: '15:00', endTime: '18:00', type: AppointmentType.VIDEO },
              { dayOfWeek: 5, startTime: '10:00', endTime: '14:00', type: AppointmentType.IN_CLINIC },
            ],
          },
        },
      }));
    if (!firstDoctorId) firstDoctorId = doctor.id;
  }
  console.log(`[SEED] Ensured ${doctorDefs.length} doctors with availability slots`);

  // 9. Medicines (pharmacy catalog)
  const medicineDefs = [
    { name: 'Paracetamol 500mg', brand: 'Dolo 650', manufacturer: 'Micro Labs', category: MedicineCategory.OTC, form: 'Tablet', packSize: '15 tablets', mrp: 30, sellingPrice: 27, stock: 500, requiresPrescription: false },
    { name: 'Azithromycin 500mg', brand: 'Azithral', manufacturer: 'Alembic', category: MedicineCategory.PRESCRIPTION, form: 'Tablet', packSize: '5 tablets', mrp: 110, sellingPrice: 96, stock: 200, requiresPrescription: true },
    { name: 'Cetirizine 10mg', brand: 'Cetzine', manufacturer: 'Dr. Reddy\'s', category: MedicineCategory.OTC, form: 'Tablet', packSize: '10 tablets', mrp: 25, sellingPrice: 21, stock: 350, requiresPrescription: false },
    { name: 'Vitamin D3 60K', brand: 'Uprise D3', manufacturer: 'Alkem', category: MedicineCategory.WELLNESS, form: 'Softgel', packSize: '4 capsules', mrp: 180, sellingPrice: 150, stock: 150, requiresPrescription: false },
    { name: 'Digital Thermometer', brand: 'Dr Trust', manufacturer: 'Dr Trust', category: MedicineCategory.DEVICE, form: 'Device', packSize: '1 unit', mrp: 299, sellingPrice: 219, stock: 80, requiresPrescription: false },
  ];
  for (const def of medicineDefs) {
    const existing = await prisma.medicine.findFirst({ where: { name: def.name, brand: def.brand } });
    if (!existing) await prisma.medicine.create({ data: def });
  }
  console.log(`[SEED] Ensured ${medicineDefs.length} pharmacy products`);

  // 10. Diagnostic tests
  const testDefs = [
    { name: 'Complete Blood Count (CBC)', code: 'CBC', category: 'Hematology', sampleType: 'Blood', preparation: 'No fasting required', mrp: 499, sellingPrice: 349, reportTimeHours: 12 },
    { name: 'Lipid Profile', code: 'LIPID', category: 'Biochemistry', sampleType: 'Blood', preparation: '12 hours fasting required', mrp: 899, sellingPrice: 599, reportTimeHours: 24 },
    { name: 'Thyroid Profile (T3 T4 TSH)', code: 'THYROID', category: 'Endocrinology', sampleType: 'Blood', preparation: 'No fasting required', mrp: 799, sellingPrice: 549, reportTimeHours: 24 },
    { name: 'HbA1c (Glycated Hemoglobin)', code: 'HBA1C', category: 'Diabetology', sampleType: 'Blood', preparation: 'No fasting required', mrp: 650, sellingPrice: 450, reportTimeHours: 12 },
    { name: 'Vitamin D 25-OH', code: 'VITD', category: 'Biochemistry', sampleType: 'Blood', preparation: 'No fasting required', mrp: 1500, sellingPrice: 999, reportTimeHours: 48 },
  ];
  for (const def of testDefs) {
    const existing = await prisma.diagnosticTest.findFirst({ where: { code: def.code } });
    if (!existing) {
      await prisma.diagnosticTest.create({
        data: { ...def, providerId: lab?.id ?? null, homeCollectionAvailable: true },
      });
    }
  }
  console.log(`[SEED] Ensured ${testDefs.length} diagnostic tests`);

  // 11. Sample appointment (video consultation) for the demo patient
  if (patientUser && firstDoctorId) {
    const existingAppt = await prisma.appointment.findFirst({ where: { patientId: patientUser.id } });
    if (!existingAppt) {
      const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const roomId = 'demo-room-0001';
      await prisma.appointment.create({
        data: {
          appointmentNumber: 'APT-2026-1000001',
          patientId: patientUser.id,
          doctorId: firstDoctorId,
          type: AppointmentType.VIDEO,
          status: AppointmentStatus.CONFIRMED,
          scheduledStart: start,
          scheduledEnd: new Date(start.getTime() + 30 * 60 * 1000),
          reason: 'Routine cardiac follow-up',
          fee: 599,
          videoRoomId: roomId,
          videoJoinUrl: `https://meet.pranova.health/room/${roomId}`,
        },
      });
      console.log('[SEED] Created sample video consultation appointment');
    }
  }

  // 12. Sample lab booking for the demo patient
  if (patientUser) {
    const cbc = await prisma.diagnosticTest.findFirst({ where: { code: 'CBC' } });
    const existingBooking = await prisma.labBooking.findFirst({ where: { patientId: patientUser.id } });
    if (cbc && !existingBooking) {
      await prisma.labBooking.create({
        data: {
          bookingNumber: 'LAB-2026-1000001',
          patientId: patientUser.id,
          testId: cbc.id,
          collectionType: SampleCollectionType.HOME_COLLECTION,
          scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          address: '104, Indiranagar 100ft Road',
          city: 'Bengaluru',
          pincode: '560038',
          phone: patientUser.phone ?? '+919123456789',
          amount: cbc.sellingPrice,
        },
      });
      console.log('[SEED] Created sample lab booking');
    }
  }

  // 13. Default application settings (First-time branding)
  const defaultSettings: Record<string, string> = {
    app_name: 'PRANOVA',
    app_tagline: 'Operations console',
    app_logo: '',
    app_favicon: '',
    primary_color: '#0B6E6E',
    support_email: 'support@pranova.health',
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }
  console.log('[SEED] Ensured default application settings');

  // 14. Seed Clinical Medical Documents (Asset URL resolution via APP_URL)
  if (patientUser) {
    ensureSampleDocumentsExist();
    const sampleDocId = 'ead788bd-5196-4d8f-8995-2da59577eca4';
    const docViewUrl = appUrl(`/api/v1/documents/${sampleDocId}/view`);

    await prisma.document.upsert({
      where: { id: sampleDocId },
      create: {
        id: sampleDocId,
        patientId: patientUser.id,
        title: 'Emergency Blood Chemistry & Cardiac Enzymes',
        documentType: 'LAB_REPORT',
        mimeType: 'application/pdf',
        fileSize: 430080,
        fileUrl: docViewUrl,
        filePath: 'uploads/documents/ead788bd-5196-4d8f-8995-2da59577eca4.pdf',
        notes: 'Troponin-T elevated (0.08 ng/mL). CPK-MB at upper normal limit. Urgent cardiology review advised.',
      },
      update: {
        fileUrl: docViewUrl,
        filePath: 'uploads/documents/ead788bd-5196-4d8f-8995-2da59577eca4.pdf',
        title: 'Emergency Blood Chemistry & Cardiac Enzymes',
        documentType: 'LAB_REPORT',
        mimeType: 'application/pdf',
        fileSize: 430080,
        notes: 'Troponin-T elevated (0.08 ng/mL). CPK-MB at upper normal limit. Urgent cardiology review advised.',
      },
    });

    const rxDocId = 'fa88c221-7241-4d7a-8bb3-43111b22e119';
    const rxViewUrl = appUrl(`/api/v1/documents/${rxDocId}/view`);
    await prisma.document.upsert({
      where: { id: rxDocId },
      create: {
        id: rxDocId,
        patientId: patientUser.id,
        title: 'Post-Emergency Cardiology Discharge Prescription',
        documentType: 'PRESCRIPTION',
        mimeType: 'application/pdf',
        fileSize: 215040,
        fileUrl: rxViewUrl,
        filePath: 'uploads/documents/sample_cardiac_report.pdf',
        notes: 'Tab. Aspirin 75mg 1-0-0, Tab. Atorvastatin 40mg 0-0-1, Tab. Metoprolol 25mg 1-0-0 for 14 days.',
      },
      update: {
        fileUrl: rxViewUrl,
        filePath: 'uploads/documents/sample_cardiac_report.pdf',
        notes: 'Tab. Aspirin 75mg 1-0-0, Tab. Atorvastatin 40mg 0-0-1, Tab. Metoprolol 25mg 1-0-0 for 14 days.',
      },
    });

    // Ensure initial audit log exists for demonstration
    const existingLog = await prisma.documentAccessLog.findFirst({
      where: { documentId: sampleDocId },
    });
    if (!existingLog) {
      await prisma.documentAccessLog.create({
        data: {
          documentId: sampleDocId,
          accessorId: patientUser.id,
          accessorRole: Role.PATIENT,
          action: 'DOCUMENT_UPLOADED',
          ipAddress: '127.0.0.1',
          userAgent: 'PRANOVA Seeder Engine / 1.0',
        },
      });
    }

    console.log(`[SEED] Ensured clinical documents seeded with local view URLs: ${docViewUrl}`);
  }

  console.log('[SEED] Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('[SEED] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
