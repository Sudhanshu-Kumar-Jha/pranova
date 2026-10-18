import { Router } from 'express';
import { MedicineController } from '../controllers/medicine.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { createMedicineSchema, updateMedicineSchema } from '../validators/medicine.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /medicines:
 *   get:
 *     summary: List pharmacy catalog (Admin)
 *     tags: [Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: perPage, schema: { type: integer, default: 12 } }
 *       - { in: query, name: category, schema: { type: string, enum: [OTC, PRESCRIPTION, WELLNESS, DEVICE] } }
 *       - { in: query, name: q, schema: { type: string } }
 *     responses: { 200: { description: Medicines retrieved } }
 *   post:
 *     summary: Add a medicine to the catalog (Admin)
 *     tags: [Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, mrp, sellingPrice]
 *             properties:
 *               name: { type: string, example: Paracetamol 500mg }
 *               brand: { type: string, example: Dolo }
 *               category: { type: string, enum: [OTC, PRESCRIPTION, WELLNESS, DEVICE] }
 *               mrp: { type: number, example: 30 }
 *               sellingPrice: { type: number, example: 27 }
 *               stock: { type: integer, example: 500 }
 *               requiresPrescription: { type: boolean, example: false }
 *     responses: { 201: { description: Medicine added } }
 */
router.get('/', MedicineController.list);
router.post('/', validateRequest(createMedicineSchema), MedicineController.create);

/**
 * @openapi
 * /medicines/{id}:
 *   get:
 *     summary: Get a medicine (Admin)
 *     tags: [Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Medicine retrieved } }
 *   patch:
 *     summary: Update a medicine (Admin)
 *     tags: [Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Medicine updated } }
 *   delete:
 *     summary: Delete a medicine (Admin)
 *     tags: [Pharmacy]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Medicine removed } }
 */
router.get('/:id', MedicineController.getById);
router.patch('/:id', validateRequest(updateMedicineSchema), MedicineController.update);
router.delete('/:id', MedicineController.delete);

export default router;
