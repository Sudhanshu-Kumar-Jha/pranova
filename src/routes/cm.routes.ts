import { Router } from 'express';
import { requireCareManager } from '../middlewares/auth.middleware.js';
import { requireConsent } from '../middlewares/consent.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { CmController } from '../controllers/cm.controller.js';
import { PatientLocationController } from '../controllers/patientLocation.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { DocumentController } from '../controllers/document.controller.js';
import { ConsentController } from '../controllers/consent.controller.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { cmUpdateCaseStatusSchema, cmAvailabilitySchema, cmAddCaseNoteSchema } from '../validators/cm.validator.js';
import { completeAwaitingPaymentSchema } from '../validators/payment.validator.js';

/**
 * CARE MANAGER / MOBILE APP SURFACE.
 * Exclusively for the native Care Manager app; guarded by requireCareManager.
 * Every route is scoped to the authenticated care manager's own data.
 */
const router = Router();

// ---------------- Public (pre-authentication) ----------------
// Same contract as GET /app/config: branding the sign-in screen needs before
// a care manager has a token. It exposes nothing private.

/**
 * @openapi
 * /cm/config:
 *   get:
 *     summary: Admin-configured branding (Care Manager App, public)
 *     tags: [App - Care Manager]
 *     responses: { 200: { description: App configuration retrieved } }
 */
router.get('/config', SettingsController.appConfig);

// Everything below this line requires an authenticated CARE_MANAGER.
router.use(requireCareManager);

/**
 * @openapi
 * /cm/me:
 *   get:
 *     summary: Get my care-manager profile & active case count (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Profile retrieved } }
 */
router.get('/me', CmController.me);

/**
 * @openapi
 * /cm/availability:
 *   patch:
 *     summary: Update availability and current location (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable: { type: boolean, example: true }
 *               latitude: { type: number, example: 12.9716 }
 *               longitude: { type: number, example: 77.5946 }
 *     responses: { 200: { description: Availability updated } }
 */
router.patch('/availability', validateRequest(cmAvailabilitySchema), CmController.setAvailability);

/**
 * @openapi
 * /cm/cases:
 *   get:
 *     summary: List cases assigned to me (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CANCELLED] } }
 *     responses: { 200: { description: Assigned cases retrieved } }
 */
router.get('/cases', CmController.listCases);

/**
 * @openapi
 * /cm/cases/{id}:
 *   get:
 *     summary: View one of my assigned cases with timeline (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Case retrieved } }
 */
router.get('/cases/:id', CmController.getCase);

/**
 * @openapi
 * /cm/cases/{id}/notes:
 *   post:
 *     summary: Add a clinical or field observation note with GPS pin (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notes]
 *             properties:
 *               notes: { type: string, example: "Patient vitals stable: BP 120/80, SpO2 99%." }
 *               latitude: { type: number, example: 12.9716 }
 *               longitude: { type: number, example: 77.5946 }
 *     responses: { 200: { description: Field note added } }
 */
router.post('/cases/:id/notes', validateRequest(cmAddCaseNoteSchema), CmController.addCaseNote);

/**
 * @openapi
 * /cm/cases/{id}/status:
 *   patch:
 *     summary: Update the status of an assigned case (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CANCELLED] }
 *               notes: { type: string, example: "Reached patient; stabilising on site." }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses: { 200: { description: Case status updated } }
 */
router.patch('/cases/:id/status', validateRequest(cmUpdateCaseStatusSchema), CmController.updateCaseStatus);

// ---------------- Clinical Billing / Awaiting Payment (Module 8) ----------------

/**
 * @openapi
 * /cm/cases/{id}/awaiting-payment:
 *   post:
 *     summary: Complete clinical field service and bill patient (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 850.00 }
 *               notes: { type: string, example: "Home visit wound dressing completed." }
 *     responses: { 200: { description: Case marked COMPLETED_AWAITING_PAYMENT } }
 */
router.post(
  '/cases/:id/awaiting-payment',
  validateRequest(completeAwaitingPaymentSchema),
  PaymentController.completeAwaitingPayment
);

// ---------------- Consent-Guarded Document Access (Modules 2 & 6) ----------------

/**
 * @openapi
 * /cm/consents/check/{patientId}:
 *   get:
 *     summary: Verify whether active clinical consent exists for a patient (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: patientId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Consent verification result } }
 */
router.get('/consents/check/:patientId', ConsentController.check);

/**
 * @openapi
 * /cm/patients/{patientId}/documents:
 *   get:
 *     summary: View patient clinical documents under active consent (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: patientId, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Clinical documents retrieved } }
 */
router.get('/patients/:patientId/documents', requireConsent, DocumentController.cmListPatientDocuments);

/**
 * @openapi
 * /cm/documents/{id}:
 *   get:
 *     summary: View a single clinical document with consent check (Care Manager App)
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Clinical document retrieved } }
 */
router.get('/documents/:id', requireConsent, DocumentController.getById);


/**
 * @openapi
 * /cm/cases/{id}/patient-location:
 *   get:
 *     summary: Patient's live position for one of my active cases (Care Manager App)
 *     description: >
 *       Returns the last position reported by the patient's device so the care
 *       manager can reach them. Requires the case to be assigned to the caller,
 *       to still be active, and the patient's consent (granted automatically
 *       when the case was raised, and revocable by the patient) to be
 *       unexpired. Every read is recorded on the case timeline.
 *     tags: [App - Care Manager]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: Patient location retrieved }
 *       403: { description: Consent missing/expired, or the case is closed }
 *       404: { description: Case not found or not assigned to you }
 */
router.get('/cases/:id/patient-location', PatientLocationController.forCareManager);

export default router;
