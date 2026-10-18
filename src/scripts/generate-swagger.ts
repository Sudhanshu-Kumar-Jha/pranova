import fs from 'fs';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'PRANOVA Healthcare Coordination Platform - REST API',
    version: '1.0.0',
    description: `
**PRANOVA** is a headless, API-first Healthcare Coordination Engine powering:
- **Admin Web Console** (React-Admin Web)
- **Patient Mobile App** (React Native / Expo)
- **Care Manager Mobile App** (React Native / Expo)

### Authentication
Most endpoints require a valid JWT Bearer token in the \`Authorization\` header:
\`\`\`http
Authorization: Bearer <ACCESS_TOKEN>
\`\`\`
Use the **Authorize** button below to paste your Admin JWT token for interactive testing.
    `,
    contact: {
      name: 'PRANOVA Engineering Team',
      email: 'engineering@pranova.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server (v1)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT Bearer token obtained from /auth/admin/login or /auth/otp/verify',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object', nullable: true },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 42 },
              page: { type: 'integer', example: 1 },
              perPage: { type: 'integer', example: 10 },
            },
          },
          timestamp: { type: 'string', format: 'date-time', example: '2026-10-15T00:00:00.000Z' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Resource not found' },
          errors: { type: 'array', items: { type: 'object' }, nullable: true },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string', example: '/api/v1/cases/xyz' },
          method: { type: 'string', example: 'GET' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['ADMIN', 'PATIENT', 'CARE_MANAGER', 'FAMILY_MEMBER'] },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          isPhoneVerified: { type: 'boolean' },
          isEmailVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Provider: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Fortis Hospital Indiranagar' },
          type: { type: 'string', enum: ['HOSPITAL', 'LAB', 'CLINIC', 'AMBULANCE', 'PHARMACY'] },
          status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'DEACTIVATED'] },
          licenseNumber: { type: 'string', nullable: true },
          contactPerson: { type: 'string', nullable: true },
          phone: { type: 'string', example: '+918012345678' },
          email: { type: 'string', format: 'email', nullable: true },
          address: { type: 'string', example: '100 Feet Rd, HAL 2nd Stage' },
          city: { type: 'string', example: 'Bengaluru' },
          state: { type: 'string', example: 'Karnataka' },
          pincode: { type: 'string', example: '560038' },
          latitude: { type: 'number', example: 12.9716 },
          longitude: { type: 'number', example: 77.5946 },
          rating: { type: 'number', example: 4.8 },
          operatingHours: { type: 'string', example: '24/7 Emergency Care' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Case: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          caseNumber: { type: 'string', example: 'PRN-2026-9812' },
          priority: { type: 'string', enum: ['P1', 'P2', 'P3'] },
          status: { type: 'string', enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'] },
          title: { type: 'string', example: 'EMERGENCY SOS: Acute Medical Distress' },
          description: { type: 'string', nullable: true },
          triggerSource: { type: 'string', enum: ['SOS_BUTTON', 'PATIENT_REQUEST', 'ADMIN_MANUAL', 'CARE_MANAGER'] },
          patientId: { type: 'string', format: 'uuid' },
          careManagerId: { type: 'string', format: 'uuid', nullable: true },
          providerId: { type: 'string', format: 'uuid', nullable: true },
          incidentAddress: { type: 'string', nullable: true },
          incidentLatitude: { type: 'number', nullable: true },
          incidentLongitude: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          assignedAt: { type: 'string', format: 'date-time', nullable: true },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CaseTimeline: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          caseId: { type: 'string', format: 'uuid' },
          action: { type: 'string', example: 'CASE_ASSIGNED' },
          oldStatus: { type: 'string', nullable: true },
          newStatus: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          actorRole: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      EmergencySosRequest: {
        type: 'object',
        required: ['patientId'],
        properties: {
          patientId: { type: 'string', format: 'uuid', description: 'Patient User UUID' },
          patientPhone: { type: 'string', example: '+919123456789' },
          incidentLatitude: { type: 'number', example: 12.9784 },
          incidentLongitude: { type: 'number', example: 77.6408 },
          incidentAddress: { type: 'string', example: '104, Indiranagar 100ft Road, Bengaluru' },
          description: { type: 'string', example: 'Patient reports severe acute chest tightness and dyspnea' },
        },
      },
      AssignCaseRequest: {
        type: 'object',
        required: ['careManagerId'],
        properties: {
          careManagerId: { type: 'string', format: 'uuid', description: 'Care Manager User UUID' },
          notes: { type: 'string', example: 'Immediate field triage dispatched' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './dist/routes/*.js',
  ],
};

export function generateSwaggerFile() {
  const swaggerDir = path.resolve(process.cwd(), 'swagger');
  if (!fs.existsSync(swaggerDir)) {
    fs.mkdirSync(swaggerDir, { recursive: true });
  }

  const swaggerSpec = swaggerJsdoc(options);
  const outputPath = path.join(swaggerDir, 'swagger.json');

  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8');
  console.log(`[SWAGGER] OpenAPI 3.0 specification generated successfully at: ${outputPath}`);
  return swaggerSpec;
}

// Run directly if called via CLI
generateSwaggerFile();
