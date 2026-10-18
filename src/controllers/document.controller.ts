import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class DocumentController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const document = await DocumentService.uploadDocument(patientId, req.body);
      return ApiResponse.created(res, 'Document uploaded successfully', document);
    } catch (error) {
      next(error);
    }
  }

  static async myDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const documents = await DocumentService.listPatientDocuments(patientId);
      return ApiResponse.success(res, 'Documents retrieved successfully', documents);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const user = req.user;
      if (!user) throw ApiError.unauthorized('Authentication required');

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
      const userAgent = req.headers['user-agent'];

      const document = await DocumentService.getDocumentById(id, user.id, user.role, ipAddress, userAgent);
      return ApiResponse.success(res, 'Document details retrieved', document);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const patientId = req.user?.id;
      if (!patientId) throw ApiError.unauthorized('Patient authentication required');

      const result = await DocumentService.deleteDocument(id, patientId);
      return ApiResponse.success(res, 'Document deleted successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async cmListPatientDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = req.params.patientId as string;
      const cmId = req.user?.id;
      if (!cmId) throw ApiError.unauthorized('Care manager authentication required');

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
      const userAgent = req.headers['user-agent'];

      const documents = await DocumentService.listDocumentsForCareManager(patientId, cmId, ipAddress, userAgent);
      return ApiResponse.success(res, 'Patient documents retrieved under active consent', documents);
    } catch (error) {
      next(error);
    }
  }

  static async adminList(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DocumentService.listAdminDocuments(req.query);
      return ApiResponse.send({
        res,
        statusCode: 200,
        message: 'Medical documents retrieved successfully',
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          perPage: result.perPage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminGetById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const adminId = req.user?.id;
      if (!adminId) throw ApiError.unauthorized('Admin credentials required');

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
      const userAgent = req.headers['user-agent'];

      const document = await DocumentService.getAdminDocumentById(id, adminId, ipAddress, userAgent);
      return ApiResponse.success(res, 'Medical document retrieved with audit logging', document);
    } catch (error) {
      next(error);
    }
  }

  static async adminGetAccessLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const logs = await DocumentService.getDocumentAccessLogs(id);
      return ApiResponse.success(res, 'Document immutable access logs retrieved', logs);
    } catch (error) {
      next(error);
    }
  }

  /**
   * View or download clinical document directly in browser or mobile webview
   * (Direct asset endpoint, auto-logs DPDP/HIPAA access)
   */
  static async viewDocumentFile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const isRaw = req.query.raw === 'true' || req.query.download === '1' || req.path.endsWith('/file');
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
      const userAgent = req.headers['user-agent'];

      if (isRaw) {
        const fileInfo = await DocumentService.getRawDocumentFile(id, ipAddress, userAgent);
        if (fileInfo.filePath && fs.existsSync(fileInfo.filePath)) {
          res.setHeader('Content-Type', fileInfo.mimeType);
          if (req.query.download === '1') {
            return res.download(fileInfo.filePath, fileInfo.fileName);
          }
          return res.sendFile(fileInfo.filePath);
        }
      }

      const html = await DocumentService.renderDocumentHtml(id, ipAddress, userAgent);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      next(error);
    }
  }
}
