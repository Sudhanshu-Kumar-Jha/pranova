import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorStatusSchema,
  createSlotSchema,
} from '../validators/doctor.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /doctors:
 *   get:
 *     summary: List doctors with specialty/city/status filters (Admin)
 *     tags: [Doctors]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 10 } }
 *       - { in: query, name: specialtyId, schema: { type: string, format: uuid } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE, ON_LEAVE] } }
 *       - { in: query, name: q, schema: { type: string } }
 *     responses: { 200: { description: Doctors retrieved } }
 *   post:
 *     summary: Onboard a doctor (Admin)
 *     tags: [Doctors]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [specialtyId, firstName, lastName]
 *             properties:
 *               specialtyId: { type: string, format: uuid }
 *               firstName: { type: string, example: Asha }
 *               lastName: { type: string, example: Menon }
 *               qualifications: { type: string, example: MBBS, MD (Cardiology) }
 *               experienceYears: { type: integer, example: 12 }
 *               consultationFeeVideo: { type: number, example: 599 }
 *               consultationFeeClinic: { type: number, example: 799 }
 *               city: { type: string, example: Bengaluru }
 *               isVideoEnabled: { type: boolean, example: true }
 *     responses: { 201: { description: Doctor onboarded } }
 */
router.get('/', DoctorController.list);
router.post('/', validateRequest(createDoctorSchema), DoctorController.create);

/**
 * @openapi
 * /doctors/{id}:
 *   get:
 *     summary: Get a doctor with availability slots (Admin)
 *     tags: [Doctors]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Doctor retrieved } }
 *   patch:
 *     summary: Update a doctor (Admin)
 *     tags: [Doctors]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Doctor updated } }
 *   delete:
 *     summary: Delete a doctor (Admin)
 *     tags: [Doctors]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Doctor removed } }
 */
router.get('/:id', DoctorController.getById);
router.patch('/:id', validateRequest(updateDoctorSchema), DoctorController.update);
router.delete('/:id', DoctorController.delete);

/**
 * @openapi
 * /doctors/{id}/status:
 *   patch:
 *     summary: Change doctor status (Admin)
 *     tags: [Doctors]
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
 *               status: { type: string, enum: [ACTIVE, INACTIVE, ON_LEAVE] }
 *     responses: { 200: { description: Status changed } }
 */
router.patch('/:id/status', validateRequest(updateDoctorStatusSchema), DoctorController.updateStatus);

/**
 * @openapi
 * /doctors/{id}/slots:
 *   post:
 *     summary: Add a weekly availability slot (Admin)
 *     tags: [Doctors]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dayOfWeek, startTime, endTime]
 *             properties:
 *               dayOfWeek: { type: integer, minimum: 0, maximum: 6, example: 1 }
 *               startTime: { type: string, example: "09:00" }
 *               endTime: { type: string, example: "13:00" }
 *               type: { type: string, enum: [VIDEO, AUDIO, IN_CLINIC], example: VIDEO }
 *     responses: { 201: { description: Slot added } }
 */
router.post('/:id/slots', validateRequest(createSlotSchema), DoctorController.addSlot);

/**
 * @openapi
 * /doctors/{id}/slots/{slotId}:
 *   delete:
 *     summary: Remove an availability slot (Admin)
 *     tags: [Doctors]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: path, name: slotId, required: true, schema: { type: string, format: uuid } }
 *     responses: { 200: { description: Slot removed } }
 */
router.delete('/:id/slots/:slotId', DoctorController.removeSlot);

export default router;
