import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { otpRateLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  adminLoginSchema,
  adminRegisterSchema,
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @openapi
 * /auth/admin/login:
 *   post:
 *     summary: Authenticate Administrator (Web Panel)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@pranova.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123456
 *     responses:
 *       200:
 *         description: Authentication successful, returns JWT access and refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/admin/login',
  validateRequest(adminLoginSchema),
  AuthController.adminLogin
);

/**
 * @openapi
 * /auth/admin/register:
 *   post:
 *     summary: Register a new Administrator (Admin Only)
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ops@pranova.com
 *               password:
 *                 type: string
 *                 example: OpsSecure@2026
 *               firstName:
 *                 type: string
 *                 example: Sarah
 *               lastName:
 *                 type: string
 *                 example: Jenkins
 *               department:
 *                 type: string
 *                 example: Clinical Operations
 *     responses:
 *       201:
 *         description: Administrator registered successfully
 *       403:
 *         description: Forbidden - Admin privileges required
 */
router.post(
  '/admin/register',
  requireAdmin,
  validateRequest(adminRegisterSchema),
  AuthController.adminRegister
);

/**
 * @openapi
 * /auth/otp/send:
 *   post:
 *     summary: Dispatch OTP to mobile phone (Patient / Care Manager)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP dispatched successfully (Demo code 123456)
 */
router.post(
  '/otp/send',
  otpRateLimiter,
  validateRequest(sendOtpSchema),
  AuthController.sendOtp
);

/**
 * @openapi
 * /auth/otp/verify:
 *   post:
 *     summary: Verify OTP and establish authenticated mobile session
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified and session tokens issued
 */
router.post(
  '/otp/verify',
  otpRateLimiter,
  validateRequest(verifyOtpSchema),
  AuthController.verifyOtp
);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT Access Token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token (also accepted via HttpOnly cookie)
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post(
  '/refresh-token',
  validateRequest(refreshTokenSchema),
  AuthController.refreshToken
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/me',
  authenticate,
  AuthController.getMe
);

export default router;
