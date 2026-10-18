import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Detect production runtime: npm start, execution from dist/ directory, or explicit NODE_ENV=production
const isDistExecution = Boolean((typeof __dirname !== 'undefined' && __dirname.includes('dist')) || process.argv[1]?.replace(/\\/g, '/').includes('/dist/'));
const isNpmStart = process.env.npm_lifecycle_event === 'start';
const isProduction = process.env.NODE_ENV === 'production' || isNpmStart || isDistExecution;

if (isProduction && process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'production';
  if (!process.env.APP_ENV || process.env.APP_ENV === 'development') {
    process.env.APP_ENV = 'production';
  }
} else if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// 1. Resolve Database Configuration (MySQL)
const dbConnection = process.env.DB_CONNECTION || 'mysql';
let dbHost = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
let dbPort = Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306;
let dbDatabase = process.env.DB_DATABASE || process.env.MYSQLDATABASE || 'pranova_db';
let dbUsername = process.env.DB_USERNAME || process.env.MYSQLUSER || 'root';
let dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
let dbSchema = process.env.DB_SCHEMA || 'pranova_db';
const dbSslMode = process.env.DB_SSLMODE || 'prefer';

// Enforce single source of truth between DATABASE_URL and DB_* settings
let databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (databaseUrl && !databaseUrl.includes('${')) {
  // If an explicit DATABASE_URL is configured, parse components to keep config.db synchronized
  try {
    const normalized = databaseUrl.replace(/^mysql:\/\//i, 'http://');
    const parsed = new URL(normalized);
    if (parsed.hostname) dbHost = parsed.hostname;
    if (parsed.port) dbPort = Number(parsed.port);
    if (parsed.username) dbUsername = decodeURIComponent(parsed.username);
    if (parsed.password) dbPassword = decodeURIComponent(parsed.password);
    if (parsed.pathname && parsed.pathname.length > 1) {
      dbDatabase = parsed.pathname.slice(1);
    }
  } catch {
    // Retain defaults if URL is custom format
  }
} else {
  // Construct standard MySQL connection string from DB_* variables
  const userPass = dbPassword ? `${encodeURIComponent(dbUsername)}:${encodeURIComponent(dbPassword)}` : encodeURIComponent(dbUsername);
  databaseUrl = `mysql://${userPass}@${dbHost}:${dbPort}/${dbDatabase}`;
  process.env.DATABASE_URL = databaseUrl;
}

const resolvedPort = Number(process.env.PORT) || 5000;
let resolvedAppUrl = process.env.APP_URL;

if (!resolvedAppUrl || resolvedAppUrl === 'http://localhost:5000') {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    resolvedAppUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  } else if (process.env.RAILWAY_STATIC_URL) {
    resolvedAppUrl = `https://${process.env.RAILWAY_STATIC_URL}`;
  } else if (!resolvedAppUrl) {
    resolvedAppUrl = `http://localhost:${resolvedPort}`;
  }
}

export const config = {
  app: {
    name: process.env.APP_NAME || 'PRANOVA',
    env: process.env.NODE_ENV || process.env.APP_ENV || 'production',
    debug: process.env.APP_DEBUG === 'true' && process.env.NODE_ENV !== 'production',
    url: resolvedAppUrl.replace(/\/$/, ''),
    port: resolvedPort,
    timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  },
  db: {
    connection: dbConnection,
    host: dbHost,
    port: dbPort,
    database: dbDatabase,
    username: dbUsername,
    password: dbPassword,
    schema: dbSchema,
    url: databaseUrl,
  },
  admin: {
    firstName: process.env.ADMIN_FIRST_NAME || 'Super',
    lastName: process.env.ADMIN_LAST_NAME || 'Admin',
    email: process.env.ADMIN_EMAIL || 'admin@pranova.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    phone: process.env.ADMIN_PHONE || '+919876500000',
    department: process.env.ADMIN_DEPARTMENT || 'Operations',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'pranova_super_secret_jwt_access_token_key_2026_healthcare',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'pranova_super_secret_jwt_refresh_token_key_2026_healthcare',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  cors: {
    allowedOrigins: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:5173', 'http://localhost:3000'],
    adminWebUrl: process.env.ADMIN_WEB_URL || 'http://localhost:5173',
  },
  swagger: {
    enabled: process.env.ENABLE_SWAGGER !== 'false',
  },
};

export default config;
