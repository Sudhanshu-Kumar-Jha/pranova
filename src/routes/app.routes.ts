import { Router } from 'express';
import { requirePatient } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { sosRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { SpecialtyController } from '../controllers/specialty.controller.js';
import { DoctorController } from '../controllers/doctor.controller.js';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { MedicineController } from '../controllers/medicine.controller.js';
import { OrderController } from '../controllers/order.controller.js';
import { DiagnosticController } from '../controllers/diagnostic.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { PatientController } from '../controllers/patient.controller.js';
import { CaseController } from '../controllers/case.controller.js';
import { DocumentController } from '../controllers/document.controller.js';
import { ConsentController } from '../controllers/consent.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { bookAppointmentSchema, cancelAppointmentSchema } from '../validators/appointment.validator.js';
import { placeOrderSchema } from '../validators/order.validator.js';
import { bookLabTestSchema } from '../validators/diagnostic.validator.js';
import { updatePatientSchema } from '../validators/patient.validator.js';
import { uploadDocumentSchema } from '../validators/document.validator.js';
import { grantConsentSchema, revokeConsentSchema } from '../validators/consent.validator.js';
import { createPaymentOrderSchema, mockCheckoutSchema } from '../validators/payment.validator.js';

/**
 * PATIENT / MOBILE APP SURFACE.
 * Every route here is exclusively for the native Patient app and is guarded by
 * `requirePatient`. Admin (web) endpoints live under their own resource paths.
 * This enforces the AGENTS.md "strict platform separation" hard constraint.
 */
const router = Router();

// ---------------- Public (pre-authentication) ----------------
// Branding and storefront rules are needed to render the sign-in screen, so
// this single route sits in front of the guard. It exposes nothing private.

/**
 * @openapi
 * /app/config:
 *   get:
 *     summary: Admin-configured branding and storefront rules (Patient App, public)
 *     tags: [App - Config]
 *     responses: { 200: { description: App configuration retrieved } }
 */
router.get('/config', SettingsController.appConfig);

// Everything below this line requires an authenticated PATIENT.
router.use(requirePatient);

// ---------------- Emergency SOS ----------------

/**
 * @openapi
 * /app/sos:
 *   post:
 *     summary: Trigger P1 Emergency SOS signal (Patient App)
 *     tags: [App - Emergency]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               incidentLatitude: { type: number, example: 12.9716 }
 *               incidentLongitude: { type: number, example: 77.5946 }
 *               incidentAddress: { type: string, example: "12, MG Road, Bengaluru" }
 *               description: { type: string, example: "Acute chest pain distress" }
 *     responses: { 201: { description: SOS activated } }
 */
router.post('/sos', sosRateLimiter, (req, res, next) => {
  if (!req.body) req.body = {};
  if (!req.body.patientId && req.user?.id) {
    req.body.patientId = req.user.id;
  }
  if (!req.body.patientPhone && req.user?.phone) {
    req.body.patientPhone = req.user.phone;
  }
  return CaseController.triggerSos(req, res, next);
});

// ---------------- Patient Profile & Address ----------------

/**
 * @openapi
 * /app/profile:
 *   get:
 *     summary: Get my patient profile, vitals and address (Patient App)
 *     tags: [App - Profile]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Profile retrieved } }
 *   patch:
 *     summary: Update my patient profile, address, and demographics (Patient App)
 *     tags: [App - Profile]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string, example: "Rahul" }
 *               lastName: { type: string, example: "Sharma" }
 *               email: { type: string, format: email, example: "rahul@pranova.com" }
 *               gender: { type: string, example: "Male" }
 *               bloodGroup: { type: string, example: "O+" }
 *               primaryAddress: { type: string, example: "12, MG Road" }
 *               city: { type: string, example: "Bengaluru" }
 *               pincode: { type: string, example: "560001" }
 *               emergencyContactName: { type: string, example: "Sunita Sharma" }
 *               emergencyContactPhone: { type: string, example: "+919876543210" }
 *     responses: { 200: { description: Profile updated successfully } }
 */
router.get('/profile', PatientController.getMyProfile);
router.patch('/profile', validateRequest(updatePatientSchema), PatientController.updateMyProfile);

// ---------------- Discovery / catalog ----------------

/**
 * @openapi
 * /app/specialties:
 *   get:
 *     summary: Browse active specialties (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Specialties retrieved } }
 */
router.get('/specialties', SpecialtyController.listPublic);

/**
 * @openapi
 * /app/doctors:
 *   get:
 *     summary: Search the doctor directory (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: specialtyId, schema: { type: string, format: uuid } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: q, schema: { type: string } }
 *     responses: { 200: { description: Doctor directory retrieved } }
 */
router.get('/doctors', DoctorController.listPublic);

/**
 * @openapi
 * /app/doctors/{id}:
 *   get:
 *     summary: View a doctor profile with availability (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Doctor profile retrieved } }
 */
router.get('/doctors/:id', DoctorController.getPublicById);

// ---------------- Appointments & video consultation ----------------

/**
 * @openapi
 * /app/appointments:
 *   get:
 *     summary: List my appointments (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Appointments retrieved } }
 *   post:
 *     summary: Book an appointment / video consultation (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, scheduledStart]
 *             properties:
 *               doctorId: { type: string, format: uuid }
 *               type: { type: string, enum: [VIDEO, AUDIO, IN_CLINIC], example: VIDEO }
 *               scheduledStart: { type: string, format: date-time, example: "2026-10-20T10:30:00.000Z" }
 *               durationMinutes: { type: integer, example: 30 }
 *               reason: { type: string, example: "Follow-up on blood pressure" }
 *               symptoms: { type: string, example: "Occasional dizziness" }
 *     responses: { 201: { description: Appointment booked (includes videoJoinUrl for tele-consults) } }
 */
router.get('/appointments', AppointmentController.myAppointments);
router.post('/appointments', validateRequest(bookAppointmentSchema), AppointmentController.book);

/**
 * @openapi
 * /app/appointments/{id}:
 *   get:
 *     summary: View one of my appointments (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Appointment retrieved } }
 */
router.get('/appointments/:id', AppointmentController.myAppointmentById);

/**
 * @openapi
 * /app/appointments/{id}/video-token:
 *   post:
 *     summary: Get a join token for the video consultation room (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Video token issued } }
 */
router.post('/appointments/:id/video-token', AppointmentController.videoToken);

/**
 * @openapi
 * /app/appointments/{id}/cancel:
 *   post:
 *     summary: Cancel my appointment (Patient App)
 *     tags: [App - Consultation]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cancelReason]
 *             properties:
 *               cancelReason: { type: string, example: "Schedule clash" }
 *     responses: { 200: { description: Appointment cancelled } }
 */
router.post('/appointments/:id/cancel', validateRequest(cancelAppointmentSchema), AppointmentController.cancel);

// ---------------- Pharmacy ----------------

/**
 * @openapi
 * /app/medicines:
 *   get:
 *     summary: Browse the pharmacy catalog (Patient App)
 *     tags: [App - Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string, enum: [OTC, PRESCRIPTION, WELLNESS, DEVICE] } }
 *     responses: { 200: { description: Catalog retrieved } }
 */
router.get('/medicines', MedicineController.listPublic);

/**
 * @openapi
 * /app/orders:
 *   get:
 *     summary: List my medicine orders (Patient App)
 *     tags: [App - Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Orders retrieved } }
 *   post:
 *     summary: Place a medicine order (Patient App)
 *     tags: [App - Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, deliveryAddress, phone]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [medicineId, quantity]
 *                   properties:
 *                     medicineId: { type: string, format: uuid }
 *                     quantity: { type: integer, example: 2 }
 *               deliveryAddress: { type: string, example: "12, MG Road, Bengaluru" }
 *               city: { type: string, example: Bengaluru }
 *               pincode: { type: string, example: "560001" }
 *               phone: { type: string, example: "+919123456789" }
 *     responses: { 201: { description: Order placed } }
 */
router.get('/orders', OrderController.myOrders);
router.post('/orders', validateRequest(placeOrderSchema), OrderController.place);

/**
 * @openapi
 * /app/orders/{id}:
 *   get:
 *     summary: Track one of my orders (Patient App)
 *     tags: [App - Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Order retrieved } }
 */
router.get('/orders/:id', OrderController.myOrderById);

// ---------------- Diagnostics ----------------

/**
 * @openapi
 * /app/lab-tests:
 *   get:
 *     summary: Browse diagnostic tests (Patient App)
 *     tags: [App - Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string } }
 *     responses: { 200: { description: Test catalog retrieved } }
 */
router.get('/lab-tests', DiagnosticController.listPublicTests);

/**
 * @openapi
 * /app/lab-bookings:
 *   get:
 *     summary: List my lab bookings (Patient App)
 *     tags: [App - Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lab bookings retrieved } }
 *   post:
 *     summary: Book a diagnostic test (Patient App)
 *     tags: [App - Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testId, scheduledDate, phone]
 *             properties:
 *               testId: { type: string, format: uuid }
 *               collectionType: { type: string, enum: [HOME_COLLECTION, LAB_VISIT], example: HOME_COLLECTION }
 *               scheduledDate: { type: string, format: date-time, example: "2026-10-21T07:00:00.000Z" }
 *               address: { type: string, example: "12, MG Road, Bengaluru" }
 *               city: { type: string, example: Bengaluru }
 *               pincode: { type: string, example: "560001" }
 *               phone: { type: string, example: "+919123456789" }
 *     responses: { 201: { description: Lab test booked } }
 */
router.get('/lab-bookings', DiagnosticController.myBookings);
router.post('/lab-bookings', validateRequest(bookLabTestSchema), DiagnosticController.book);

/**
 * @openapi
 * /app/lab-bookings/{id}:
 *   get:
 *     summary: Track one of my lab bookings (Patient App)
 *     tags: [App - Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Lab booking retrieved } }
 */
router.get('/lab-bookings/:id', DiagnosticController.myBookingById);

// ---------------- Clinical Documents (Module 2) ----------------

/**
 * @openapi
 * /app/documents:
 *   get:
 *     summary: List my uploaded clinical documents (Patient App)
 *     tags: [App - Documents]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Documents retrieved } }
 *   post:
 *     summary: Upload / register a new clinical document (Patient App)
 *     tags: [App - Documents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, fileUrl]
 *             properties:
 *               title: { type: string, example: "Discharge Summary Hospital A" }
 *               documentType: { type: string, enum: [PRESCRIPTION, LAB_REPORT, DISCHARGE_SUMMARY, INSURANCE_POLICY, VACCINATION_RECORD, OTHER], example: DISCHARGE_SUMMARY }
 *               fileUrl: { type: string, example: "https://storage.pranova.com/docs/doc_123.pdf" }
 *               mimeType: { type: string, example: "application/pdf" }
 *               fileSize: { type: integer, example: 204800 }
 *               notes: { type: string, example: "Cardiology follow up" }
 *     responses: { 201: { description: Document uploaded } }
 */
router.get('/documents', DocumentController.myDocuments);
router.post('/documents', validateRequest(uploadDocumentSchema), DocumentController.upload);

/**
 * @openapi
 * /app/documents/{id}:
 *   get:
 *     summary: View a single clinical document (Patient App)
 *     tags: [App - Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Document retrieved } }
 *   delete:
 *     summary: Delete a clinical document (Patient App)
 *     tags: [App - Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Document deleted } }
 */
router.get('/documents/:id', DocumentController.getById);
router.delete('/documents/:id', DocumentController.delete);

// ---------------- Consent Management (Module 6) ----------------

/**
 * @openapi
 * /app/consents:
 *   get:
 *     summary: List my active and historical consents (Patient App)
 *     tags: [App - Consent]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Consents retrieved } }
 *   post:
 *     summary: Grant consent to a Care Manager or Provider (Patient App)
 *     tags: [App - Consent]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [purpose]
 *             properties:
 *               careManagerId: { type: string, format: uuid }
 *               providerId: { type: string, format: uuid }
 *               purpose: { type: string, example: "Case Coordination & Wound Review" }
 *               scope: { type: string, example: "ALL_CLINICAL_RECORDS" }
 *               durationHours: { type: integer, example: 24 }
 *     responses: { 201: { description: Consent granted } }
 */
router.get('/consents', ConsentController.myConsents);
router.post('/consents', validateRequest(grantConsentSchema), ConsentController.grant);

/**
 * @openapi
 * /app/consents/{id}/revoke:
 *   patch:
 *     summary: Revoke an active consent (Patient App)
 *     tags: [App - Consent]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: "Treatment completed" }
 *     responses: { 200: { description: Consent revoked } }
 */
router.patch('/consents/:id/revoke', validateRequest(revokeConsentSchema), ConsentController.revoke);

// ---------------- Digital Payments & Billing (Module 8) ----------------

/**
 * @openapi
 * /app/payments/create-order:
 *   post:
 *     summary: Create a mock payment order for a completed Case (Patient App)
 *     tags: [App - Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [caseId, amount]
 *             properties:
 *               caseId: { type: string, format: uuid }
 *               amount: { type: number, example: 750.00 }
 *               currency: { type: string, example: INR }
 *     responses: { 201: { description: Mock gateway order created } }
 */
router.post('/payments/create-order', validateRequest(createPaymentOrderSchema), PaymentController.createOrder);

/**
 * @openapi
 * /app/payments/mock-checkout:
 *   post:
 *     summary: Execute mock digital checkout (Patient App)
 *     tags: [App - Payments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gatewayOrderId]
 *             properties:
 *               gatewayOrderId: { type: string }
 *               paymentMethod: { type: string, enum: [UPI, CARD, NETBANKING, WALLET], example: UPI }
 *               failSimulate: { type: boolean, default: false }
 *     responses: { 200: { description: Payment completed and Case settled to PAID } }
 */
router.post('/payments/mock-checkout', validateRequest(mockCheckoutSchema), PaymentController.mockCheckout);

/**
 * @openapi
 * /app/cases/{id}/payment:
 *   get:
 *     summary: Get payment and invoice details for a Case (Patient App)
 *     tags: [App - Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Payment details retrieved } }
 */
router.get('/cases/:id/payment', PaymentController.getCasePayment);

// ---------------- Patient Cases & Coordination ----------------
router.get('/cases', CaseController.myCases);
router.get('/cases/:id', CaseController.getById);

export default router;
