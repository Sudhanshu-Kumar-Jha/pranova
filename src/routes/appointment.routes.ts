import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { updateAppointmentStatusSchema } from '../validators/appointment.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /appointments:
 *   get:
 *     summary: List all appointments (Admin oversight)
 *     tags: [Appointments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 10 } }
 *       - { in: query, name: doctorId, schema: { type: string, format: uuid } }
 *       - { in: query, name: patientId, schema: { type: string, format: uuid } }
 *       - { in: query, name: type, schema: { type: string, enum: [VIDEO, AUDIO, IN_CLINIC] } }
 *       - { in: query, name: status, schema: { type: string, enum: [REQUESTED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW] } }
 *     responses: { 200: { description: Appointments retrieved } }
 */
router.get('/', AppointmentController.list);

/**
 * @openapi
 * /appointments/{id}:
 *   get:
 *     summary: Get an appointment (Admin)
 *     tags: [Appointments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Appointment retrieved } }
 */
router.get('/:id', AppointmentController.getById);

/**
 * @openapi
 * /appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status (Admin / clinician)
 *     tags: [Appointments]
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
 *               status: { type: string, enum: [REQUESTED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW] }
 *               prescriptionNote: { type: string, example: "Amoxicillin 500mg x 5 days" }
 *     responses: { 200: { description: Status updated } }
 */
router.patch('/:id/status', validateRequest(updateAppointmentStatusSchema), AppointmentController.updateStatus);

export default router;
