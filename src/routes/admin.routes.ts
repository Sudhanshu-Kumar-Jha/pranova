import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { createAdminSchema, updateAdminStatusSchema } from '../validators/admin.validator.js';

const router = Router();
router.use(requireAdmin);

/**
 * @openapi
 * /admins:
 *   get:
 *     summary: List administrator accounts (Admin)
 *     tags: [Administrators]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *     responses: { 200: { description: Administrators retrieved } }
 *   post:
 *     summary: Create a new administrator (Admin)
 *     tags: [Administrators]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email, example: ops.lead@pranova.com }
 *               password: { type: string, example: "StrongPass@123" }
 *               firstName: { type: string, example: Priya }
 *               lastName: { type: string, example: Nair }
 *               department: { type: string, example: Operations }
 *     responses: { 201: { description: Administrator created } }
 */
router.get('/', AdminController.list);
router.post('/', validateRequest(createAdminSchema), AdminController.create);

/**
 * @openapi
 * /admins/{id}:
 *   get:
 *     summary: Get an administrator (Admin)
 *     tags: [Administrators]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses: { 200: { description: Administrator retrieved } }
 */
router.get('/:id', AdminController.getById);

/**
 * @openapi
 * /admins/{id}/status:
 *   patch:
 *     summary: Activate / suspend an administrator (Admin)
 *     tags: [Administrators]
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
 *               status: { type: string, enum: [ACTIVE, INACTIVE, SUSPENDED] }
 *     responses: { 200: { description: Status updated } }
 */
router.patch('/:id/status', validateRequest(updateAdminStatusSchema), AdminController.updateStatus);

export default router;
