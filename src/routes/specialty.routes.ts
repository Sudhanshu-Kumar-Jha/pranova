import { Router } from 'express';
import { SpecialtyController } from '../controllers/specialty.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { createSpecialtySchema, updateSpecialtySchema } from '../validators/specialty.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /specialties:
 *   get:
 *     summary: List medical specialties (Admin)
 *     tags: [Specialties]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: isActive, schema: { type: string, enum: ['true','false'] } }
 *     responses:
 *       200: { description: Specialties retrieved }
 *   post:
 *     summary: Create a medical specialty (Admin)
 *     tags: [Specialties]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Cardiology }
 *               description: { type: string, example: Heart & cardiovascular care }
 *               iconKey: { type: string, example: heart }
 *     responses:
 *       201: { description: Specialty created }
 */
router.get('/', SpecialtyController.list);
router.post('/', validateRequest(createSpecialtySchema), SpecialtyController.create);

/**
 * @openapi
 * /specialties/{id}:
 *   get:
 *     summary: Get a specialty (Admin)
 *     tags: [Specialties]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Specialty retrieved } }
 *   patch:
 *     summary: Update a specialty (Admin)
 *     tags: [Specialties]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Specialty updated } }
 *   delete:
 *     summary: Delete a specialty (Admin)
 *     tags: [Specialties]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Specialty removed } }
 */
router.get('/:id', SpecialtyController.getById);
router.patch('/:id', validateRequest(updateSpecialtySchema), SpecialtyController.update);
router.delete('/:id', SpecialtyController.delete);

export default router;
