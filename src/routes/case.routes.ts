import { Router } from 'express';
import { CaseController } from '../controllers/case.controller.js';
import { PatientLocationController } from '../controllers/patientLocation.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  createCaseSchema,
  assignCaseSchema,
  updateCaseStatusSchema,
} from '../validators/case.validator.js';

const router = Router();

// Protect all administrative case management routes with ADMIN guard
router.use(requireAdmin);

/**
 * @openapi
 * /cases/sos:
 *   post:
 *     summary: Trigger P1 Emergency SOS and broadcast alert to connected Admin consoles (Admin Only)
 *     tags:
 *       - Emergency SOS & Cases
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmergencySosRequest'
 *     responses:
 *       201:
 *         description: Emergency SOS provisioned and alert broadcasted via Socket.io
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/sos', CaseController.triggerSos);

/**
 * @openapi
 * /cases/export/excel:
 *   post:
 *     summary: Export case management records to Excel (.xlsx) buffer
 *     tags:
 *       - Cases & Compliance Export
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Monthly clinical quality assurance audit
 *     responses:
 *       200:
 *         description: Binary spreadsheet download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *   get:
 *     summary: Export case records to Excel via GET (Requires reason query param)
 *     tags:
 *       - Cases & Compliance Export
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reason
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Binary spreadsheet download
 */
router.post('/export/excel', CaseController.exportCases);
router.get('/export/excel', CaseController.exportCases);

/**
 * @openapi
 * /cases:
 *   get:
 *     summary: List Healthcare Coordination Cases (Paginated & Filterable)
 *     tags:
 *       - Emergency SOS & Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [P1, P2, P3]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CANCELLED]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cases list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *   post:
 *     summary: Create a new Case manually
 *     tags:
 *       - Emergency SOS & Cases
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - title
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 example: Post-Operative Wound Care & Dressing
 *               priority:
 *                 type: string
 *                 enum: [P1, P2, P3]
 *                 default: P2
 *               description:
 *                 type: string
 *               providerId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Case created successfully
 */
router.get('/', CaseController.list);
router.get('/:id', CaseController.getById);
router.post('/', validateRequest(createCaseSchema), CaseController.create);

/**
 * @openapi
 * /cases/{id}/assign:
 *   patch:
 *     summary: Assign Care Manager to Case (Atomically records CaseTimeline entry)
 *     tags:
 *       - Emergency SOS & Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignCaseRequest'
 *     responses:
 *       200:
 *         description: Care Manager assigned and CaseTimeline recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.patch('/:id/assign', validateRequest(assignCaseSchema), CaseController.assign);

/**
 * @openapi
 * /cases/{id}/status:
 *   patch:
 *     summary: Update Case lifecycle status
 *     tags:
 *       - Emergency SOS & Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CANCELLED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', validateRequest(updateCaseStatusSchema), CaseController.updateStatus);

/**
 * @openapi
 * /cases/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge an active emergency alert by administrator
 *     tags:
 *       - Emergency SOS & Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Emergency alert acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/:id/acknowledge', CaseController.acknowledge);


/**
 * @openapi
 * /cases/{id}/patient-location:
 *   get:
 *     summary: Patient's live position for an active case (Admin console)
 *     description: >
 *       Returns the last position reported by the patient's own device, for
 *       dispatch. Available only while the case is active — closing the case
 *       ends location sharing. The registered address is returned for context
 *       but is never the dispatch target. Every read is recorded on the case
 *       timeline.
 *     tags: [Emergency SOS & Cases]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
 *     responses:
 *       200: { description: Patient location retrieved }
 *       403: { description: Case is closed, so sharing has ended }
 *       404: { description: Case not found }
 */
router.get('/:id/patient-location', PatientLocationController.forAdmin);

export default router;
