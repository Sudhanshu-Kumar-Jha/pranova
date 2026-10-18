import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { paymentWebhookSchema } from '../validators/payment.validator.js';

const router = Router();

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Inbound payment gateway webhook (Razorpay / Stripe)
 *     tags:
 *       - Payments & Invoices
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gatewayOrderId
 *             properties:
 *               event:
 *                 type: string
 *                 example: payment.captured
 *               gatewayOrderId:
 *                 type: string
 *               transactionId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *     responses:
 *       200:
 *         description: Webhook received and processed
 */
router.post('/webhook', validateRequest(paymentWebhookSchema), PaymentController.webhook);

export default router;
