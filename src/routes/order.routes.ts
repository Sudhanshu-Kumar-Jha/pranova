import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { updateOrderStatusSchema } from '../validators/order.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: List all medicine orders (Admin oversight)
 *     tags: [Pharmacy Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: status, schema: { type: string, enum: [PLACED, CONFIRMED, PACKED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED] } }
 *       - { in: query, name: patientId, schema: { type: string, format: uuid } }
 *     responses: { 200: { description: Orders retrieved } }
 */
router.get('/', OrderController.list);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get a medicine order (Admin)
 *     tags: [Pharmacy Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Order retrieved } }
 */
router.get('/:id', OrderController.getById);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     summary: Advance order fulfilment status (Admin)
 *     tags: [Pharmacy Orders]
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
 *               status: { type: string, enum: [PLACED, CONFIRMED, PACKED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED] }
 *     responses: { 200: { description: Order status updated } }
 */
router.patch('/:id/status', validateRequest(updateOrderStatusSchema), OrderController.updateStatus);

export default router;
