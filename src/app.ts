import fs from 'fs';
import path from 'path';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler.js';
import { ApiError } from './utils/apiError.js';
import { ApiResponse } from './utils/apiResponse.js';
import apiRoutes from './routes/index.js';
import config from './config/env.config.js';

const app: Application = express();

// Security Middlewares (contentSecurityPolicy disabled to permit Swagger UI interactive client)
app.use(helmet({ contentSecurityPolicy: false }));

// Cookie parsing
app.use(cookieParser());

// CORS configuration supporting web, LAN, and mobile environments
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://192.168.1.46:5173', 'http://192.168.1.46:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      // Allow any LAN origin in development (e.g. 192.168.x.x, 10.x.x.x, localhost, etc.)
      if (process.env.NODE_ENV !== 'production') {
        const isLanOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
        if (isLanOrigin) {
          return callback(null, true);
        }
      }
      return callback(new ApiError(403, `CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files / uploads asset serving via APP_URL
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Swagger / OpenAPI Interactive Documentation.
// Gated behind ENABLE_SWAGGER (config.swagger.enabled) so it is served only in
// dev/staging and can be switched off — or removed — for production. The
// explorer URL lives only in .env / .env.example (SWAGGER_URL); it is never
// surfaced from any client UI.
const swaggerJsonPath = path.resolve(process.cwd(), 'swagger', 'swagger.json');

if (config.swagger.enabled) {
app.use('/api-docs', swaggerUi.serve, (req: Request, res: Response, next: NextFunction) => {
  if (fs.existsSync(swaggerJsonPath)) {
    try {
      const rawSwagger = fs.readFileSync(swaggerJsonPath, 'utf-8');
      const swaggerDoc = JSON.parse(rawSwagger);
      return swaggerUi.setup(swaggerDoc, {
        customSiteTitle: 'PRANOVA Healthcare API Explorer',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          filter: true,
        },
      })(req, res, next);
    } catch (err) {
      next(err);
    }
  } else {
    return res.status(200).json({
      success: true,
      message: 'PRANOVA Healthcare Coordination API Engine is running.',
      documentation: 'Swagger documentation is kept in an uncommitted/local folder for open-source compliance.',
      instruction: "Run 'npm run generate:swagger' locally to generate and enable interactive API documentation.",
    });
  }
});

// OpenAPI JSON Schema specification endpoint
app.get('/api-docs.json', (_req: Request, res: Response) => {
  if (fs.existsSync(swaggerJsonPath)) {
    const rawSwagger = fs.readFileSync(swaggerJsonPath, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    return res.send(rawSwagger);
  }
  return res.status(404).json({
    success: false,
    message: 'swagger.json not found. Run npm run generate:swagger.',
  });
});
} // end if (config.swagger.enabled)

// Root and Health Check Endpoints
app.get('/', (_req: Request, res: Response) => {
  const adminDistPath = path.resolve(process.cwd(), 'admin-web', 'dist');
  if (fs.existsSync(adminDistPath)) {
    return res.sendFile(path.resolve(adminDistPath, 'index.html'));
  }
  return ApiResponse.success(res, 'PRANOVA Healthcare Coordination Platform is running', {
    status: 'ONLINE',
    service: 'pranova-backend',
    version: '1.0.0',
    adminWeb: '/admin',
    health: '/health',
    apiV1Health: '/api/v1/health',
    apiDocs: '/api-docs',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  return ApiResponse.success(res, 'PRANOVA API Engine is healthy', {
    status: 'ONLINE',
    service: 'pranova-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1', (_req: Request, res: Response) => {
  return ApiResponse.success(res, 'PRANOVA API Engine v1 is running', {
    status: 'ONLINE',
    service: 'pranova-backend-v1',
    health: '/api/v1/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  return ApiResponse.success(res, 'PRANOVA API Engine v1 is healthy', {
    status: 'ONLINE',
    service: 'pranova-backend-v1',
    timestamp: new Date().toISOString(),
  });
});

// API Routes Mount Point (v1)
app.use('/api/v1', apiRoutes);

// Serve Admin Web Console (if built)
const adminDistPath = path.resolve(process.cwd(), 'admin-web', 'dist');
if (fs.existsSync(adminDistPath)) {
  app.use(express.static(adminDistPath));
  app.use('/admin', express.static(adminDistPath));
  app.get('/admin/*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(adminDistPath, 'index.html'));
  });
}

// Handle 404 for undefined routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route not found: [${req.method}] ${req.originalUrl}`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
