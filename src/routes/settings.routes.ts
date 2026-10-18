import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = Router();

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get application settings / branding (public)
 *     tags: [Settings]
 *     responses: { 200: { description: Settings map returned } }
 *   put:
 *     summary: Update application settings / branding (Admin)
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               app_name: { type: string, example: PRANOVA }
 *               app_logo: { type: string, description: "URL or data: URI" }
 *               app_favicon: { type: string, description: "URL or data: URI" }
 *               primary_color: { type: string, example: "#0284c7" }
 *               support_email: { type: string, example: support@pranova.health }
 *     responses: { 200: { description: Settings updated } }
 */
router.get('/', SettingsController.get);
router.put('/', requireAdmin, validateRequest(updateSettingsSchema), SettingsController.update);

export default router;
