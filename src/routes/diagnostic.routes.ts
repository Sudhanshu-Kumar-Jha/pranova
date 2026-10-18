import { Router } from 'express';
import { DiagnosticController } from '../controllers/diagnostic.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { createTestSchema, updateTestSchema } from '../validators/diagnostic.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /diagnostic-tests:
 *   get:
 *     summary: List diagnostic test catalog (Admin)
 *     tags: [Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: q, schema: { type: string } }
 *     responses: { 200: { description: Diagnostic tests retrieved } }
 *   post:
 *     summary: Add a diagnostic test (Admin)
 *     tags: [Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, mrp, sellingPrice]
 *             properties:
 *               name: { type: string, example: Complete Blood Count (CBC) }
 *               category: { type: string, example: Hematology }
 *               sampleType: { type: string, example: Blood }
 *               preparation: { type: string, example: No fasting required }
 *               mrp: { type: number, example: 499 }
 *               sellingPrice: { type: number, example: 349 }
 *               reportTimeHours: { type: integer, example: 24 }
 *               homeCollectionAvailable: { type: boolean, example: true }
 *     responses: { 201: { description: Test added } }
 */
router.get('/', DiagnosticController.listTests);
router.post('/', validateRequest(createTestSchema), DiagnosticController.createTest);

/**
 * @openapi
 * /diagnostic-tests/{id}:
 *   get:
 *     summary: Get a diagnostic test (Admin)
 *     tags: [Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Test retrieved } }
 *   patch:
 *     summary: Update a diagnostic test (Admin)
 *     tags: [Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Test updated } }
 *   delete:
 *     summary: Delete a diagnostic test (Admin)
 *     tags: [Diagnostics]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Test removed } }
 */
router.get('/:id', DiagnosticController.getTestById);
router.patch('/:id', validateRequest(updateTestSchema), DiagnosticController.updateTest);
router.delete('/:id', DiagnosticController.deleteTest);

export default router;
