import { Router } from 'express';
import { DiagnosticController } from '../controllers/diagnostic.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { updateLabBookingStatusSchema } from '../validators/diagnostic.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /lab-bookings:
 *   get:
 *     summary: List all diagnostic lab bookings (Admin oversight)
 *     tags: [Lab Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: status, schema: { type: string, enum: [BOOKED, SAMPLE_COLLECTED, PROCESSING, REPORT_READY, CANCELLED] } }
 *       - { in: query, name: patientId, schema: { type: string, format: uuid } }
 *     responses: { 200: { description: Lab bookings retrieved } }
 */
router.get('/', DiagnosticController.listBookings);

/**
 * @openapi
 * /lab-bookings/{id}:
 *   get:
 *     summary: Get a lab booking (Admin)
 *     tags: [Lab Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Lab booking retrieved } }
 */
router.get('/:id', DiagnosticController.getBookingById);

/**
 * @openapi
 * /lab-bookings/{id}/status:
 *   patch:
 *     summary: Advance lab booking status / attach report (Admin)
 *     tags: [Lab Bookings]
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
 *               status: { type: string, enum: [BOOKED, SAMPLE_COLLECTED, PROCESSING, REPORT_READY, CANCELLED] }
 *               reportUrl: { type: string, example: "https://reports.pranova.health/r/abc.pdf" }
 *     responses: { 200: { description: Lab booking status updated } }
 */
router.patch('/:id/status', validateRequest(updateLabBookingStatusSchema), DiagnosticController.updateBookingStatus);

export default router;
