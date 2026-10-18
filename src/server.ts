import http from 'http';
// Load environment variables and Bagisto-style database configuration
import config from './config/env.config.js';
import app from './app.js';
import { prisma } from './utils/prisma.js';
import { initSocketIO } from './socket/index.js';
import { verifyDatabaseConnection, disconnectDatabase } from './db/connection.js';
import { bootstrapSuperAdmin, bootstrapSettings } from './db/bootstrap.js';

const PORT = config.app.port || process.env.PORT || 5000;
const server = http.createServer(app);

// Graceful port-in-use handling
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[PRANOVA_FATAL] Port ${PORT} is already in use by another process.`);
    console.error(`Please close the other running server or update PORT in .env.\n`);
  } else {
    console.error('[PRANOVA_FATAL] Server error:', err);
  }
  process.exit(1);
});

// Initialize Socket.io Real-Time Alert Engine
const io = initSocketIO(server);

// Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[PRANOVA] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    console.log('[PRANOVA] HTTP & Socket.io server closed.');
    try {
      await disconnectDatabase();
      console.log('[PRANOVA] Database connections closed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('[PRANOVA] Error during database disconnection:', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if shutdown hangs
  setTimeout(() => {
    console.error('[PRANOVA] Forced shutdown timeout exceeded. Exiting immediately.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[PRANOVA_FATAL] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('[PRANOVA_FATAL] Uncaught Exception:', error);
  process.exit(1);
});

async function startServer() {
  try {
    // 1. Verify connection to MySQL database server
    await verifyDatabaseConnection();

    // 2. Ensure Super Admin credentials from .env exist & are in sync
    await bootstrapSuperAdmin();

    // 3. Ensure application settings exist
    await bootstrapSettings();

    // 5. Start HTTP & WebSocket server
    const baseUrl = config.app.url;
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`  PRANOVA Healthcare Coordination API Engine        `);
      console.log(`  Mode: ${config.app.env}                           `);
      console.log(`  App URL:           ${baseUrl}                     `);
      console.log(`  Admin Console:     ${baseUrl}/admin               `);
      console.log(`  Healthcheck:       ${baseUrl}/health              `);
      console.log(`  REST API Engine:   ${baseUrl}/api/v1              `);
      console.log(`  Interactive API:   ${baseUrl}/api-docs            `);
      console.log(`  Socket.io Stream:  Online (Emergency alerts ready)`);
      console.log(`  Super Admin:       ${config.admin.email}          `);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('[PRANOVA_FATAL] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { server, io };
