import { prisma } from '../utils/prisma.js';
import config from '../config/env.config.js';

/**
 * Validates MySQL database connectivity before allowing
 * the HTTP & Socket.io server to accept incoming traffic.
 *
 * Requirements:
 * - Runs a lightweight `SELECT 1` health query.
 * - Fails fast with clear and actionable diagnostic messages if unreachable.
 * - Never silently falls back to embedded/in-memory/mock storage.
 */
export async function verifyDatabaseConnection(maxAttempts = 5, delayMs = 1000): Promise<void> {
  const { host, port, database, username } = config.db;
  console.log(`[PRANOVA_DB] Verifying connection to MySQL at ${host}:${port}/${database}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`[PRANOVA_DB] MySQL connection verified and healthy (attempt ${attempt}/${maxAttempts}).`);
      return;
    } catch (error: any) {
      if (attempt < maxAttempts) {
        console.warn(`[PRANOVA_DB] Database connection attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('\n' + '='.repeat(70));
        console.error(' [PRANOVA_FATAL] DATABASE CONNECTION FAILED');
        console.error('='.repeat(70));
        console.error(`Target Database Server:  ${host}:${port}`);
        console.error(`Target Database Name:    ${database}`);
        console.error(`Target Database User:    ${username}`);
        console.error(`Error Details:           ${error?.message || error}`);
        console.error('-'.repeat(70));
        console.error('Actionable Steps to Resolve:');
        console.error('  1. Ensure a MySQL server is installed and running:');
        console.error('     - Windows Service / XAMPP: Start-Service mysql (or via XAMPP Control Panel)');
        console.error('     - Docker Compose:   docker compose up -d mysql');
        console.error('  2. Verify the database exists. Create it if missing:');
        console.error(`     - mysql:            CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.error('  3. Check credentials in your root .env file:');
        console.error(`     - DB_HOST=${host}`);
        console.error(`     - DB_PORT=${port}`);
        console.error(`     - DB_DATABASE=${database}`);
        console.error(`     - DB_USERNAME=${username}`);
        console.error('     - DB_PASSWORD=your_actual_password');
        console.error('='.repeat(70) + '\n');
        throw new Error(`[PRANOVA_FATAL] Could not connect to MySQL server at ${host}:${port}/${database}`);
      }
    }
  }
}

/**
 * Gracefully disconnects Prisma client connections.
 * Note: Never attempts to terminate an external MySQL database service.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[PRANOVA_DB] Database client disconnected cleanly.');
  } catch (error) {
    console.error('[PRANOVA_DB] Error during Prisma disconnection:', error);
  }
}
