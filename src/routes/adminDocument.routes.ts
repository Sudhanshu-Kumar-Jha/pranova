import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { DocumentController } from '../controllers/document.controller.js';

/**
 * ADMIN & CLINICAL DOCUMENT ROUTES
 * Dedicated endpoints for Super Admin to review, audit, and inspect
 * clinical records platform-wide, and public direct asset routes for
 * browser viewing and printing.
 *
 * Compliance Note (DPDP & HIPAA):
 * Direct link viewing bypasses header Bearer requirement for seamless browser
 * tab navigation, but every single access automatically generates an immutable
 * DocumentAccessLog record.
 */
const router = Router();

// Strictly enforce Super Admin role on ALL endpoints in this router
router.use(requireAdmin);

/**
 * @openapi
 * /documents/{id}/view:
 *   get:
 *     summary: Render authentic clinical printable HTML view of a medical document
 *     tags: [Clinical Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: raw
 *         schema: { type: boolean }
 *         description: Set true to download or stream raw binary file instead of HTML view
 *       - in: query
 *         name: token
 *         schema: { type: string }
 *         description: Admin JWT token for browser tab authentication
 *     responses:
 *       200: { description: HTML Clinical Document or Raw Binary Stream }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Document not found }
 */
router.get('/:id/view', DocumentController.viewDocumentFile);

/**
 * @openapi
 * /documents/{id}/file:
 *   get:
 *     summary: Stream or download raw file attachment for a medical document
 *     tags: [Clinical Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: download
 *         schema: { type: string, enum: ['1', '0'] }
 *       - in: query
 *         name: token
 *         schema: { type: string }
 *         description: Admin JWT token for browser tab authentication
 *     responses:
 *       200: { description: Raw file streamed or attachment downloaded }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/:id/file', DocumentController.viewDocumentFile);

/**
 * @openapi
 * /admin/documents:
 *   get:
 *     summary: List all uploaded clinical documents across all patients (Admin Web)
 *     tags: [Admin - Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: caseId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: documentType
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses: { 200: { description: List of documents retrieved } }
 */
router.get('/', DocumentController.adminList);

/**
 * @openapi
 * /admin/documents/{id}:
 *   get:
 *     summary: Inspect a specific medical document metadata and download link (Admin Web)
 *     tags: [Admin - Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Document metadata retrieved and access logged } }
 */
router.get('/:id', DocumentController.adminGetById);

/**
 * @openapi
 * /admin/documents/{id}/access-logs:
 *   get:
 *     summary: Fetch immutable access logs for a specific document (Admin Web)
 *     tags: [Admin - Documents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses: { 200: { description: Immutable access logs retrieved } }
 */
router.get('/:id/access-logs', DocumentController.adminGetAccessLogs);

export default router;
