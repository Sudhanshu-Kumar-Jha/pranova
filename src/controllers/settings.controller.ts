import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class SettingsController {
  // Public: branding is needed before authentication (e.g. the login screen).
  static async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getAll();
      return ApiResponse.success(res, 'Settings retrieved successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Public: the client-safe branding + storefront config a mobile app needs
   * before sign-in. Served under /app so mobile clients keep to their surface.
   */
  static async appConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await SettingsService.getPublicAppConfig();
      return ApiResponse.success(res, 'App configuration retrieved successfully', config);
    } catch (error) {
      next(error);
    }
  }

  // Admin only.
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.update(req.body);
      return ApiResponse.success(res, 'Settings updated successfully', settings);
    } catch (error) {
      next(error);
    }
  }
}
