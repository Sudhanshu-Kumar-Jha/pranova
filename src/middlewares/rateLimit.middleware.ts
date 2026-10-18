import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Strict Rate Limiter for OTP endpoints:
 * Max 3 requests per 10 minutes per IP address.
 */
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    return ApiResponse.send({
      res,
      statusCode: 429,
      message: 'Too many OTP attempts from this network. Please wait 10 minutes before trying again.',
      data: null,
    });
  },
});

/**
 * Strict Rate Limiter for Emergency SOS:
 * Max 1 request per minute per authenticated patient.
 */
export const sosRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    if (req.user?.id) return req.user.id;
    return req.ip || 'anonymous';
  },
  handler: (_req: Request, res: Response) => {
    return ApiResponse.send({
      res,
      statusCode: 429,
      message: 'Emergency SOS already dispatched. Please wait at least 60 seconds before re-triggering.',
      data: null,
    });
  },
});
