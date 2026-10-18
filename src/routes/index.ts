import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import careManagerRoutes from './careManager.routes.js';
import providerRoutes from './provider.routes.js';
import caseRoutes from './case.routes.js';
import specialtyRoutes from './specialty.routes.js';
import doctorRoutes from './doctor.routes.js';
import appointmentRoutes from './appointment.routes.js';
import medicineRoutes from './medicine.routes.js';
import orderRoutes from './order.routes.js';
import diagnosticRoutes from './diagnostic.routes.js';
import labBookingRoutes from './labBooking.routes.js';
import appRoutes from './app.routes.js';
import cmRoutes from './cm.routes.js';
import adminRoutes from './admin.routes.js';
import settingsRoutes from './settings.routes.js';
import paymentRoutes from './payment.routes.js';
import adminDocumentRoutes from './adminDocument.routes.js';

const router = Router();

// Sub-routers mounted under /api/v1
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/care-managers', careManagerRoutes);
router.use('/providers', providerRoutes);
router.use('/cases', caseRoutes);
router.use('/documents', adminDocumentRoutes);
router.use('/admin/documents', adminDocumentRoutes);

// --- Practo-style consumer platform (Admin / Web management) ---
router.use('/specialties', specialtyRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/medicines', medicineRoutes);
router.use('/orders', orderRoutes);
router.use('/diagnostic-tests', diagnosticRoutes);
router.use('/lab-bookings', labBookingRoutes);

// --- Platform administration & configuration ---
router.use('/admins', adminRoutes);
router.use('/settings', settingsRoutes);
router.use('/payments', paymentRoutes);

// --- Patient mobile app surface (strictly separated, requirePatient) ---
router.use('/app', appRoutes);

// --- Care Manager mobile app surface (strictly separated, requireCareManager) ---
router.use('/cm', cmRoutes);

export default router;
