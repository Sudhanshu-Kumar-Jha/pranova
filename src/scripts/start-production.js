const { spawnSync, spawn } = require('child_process');

// 1. Resolve DATABASE_URL from MYSQL_URL or DB_* credentials if missing
if (!process.env.DATABASE_URL) {
  if (process.env.MYSQL_URL) {
    process.env.DATABASE_URL = process.env.MYSQL_URL;
  } else if (process.env.DB_HOST || process.env.MYSQLHOST) {
    const host = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
    const port = process.env.DB_PORT || process.env.MYSQLPORT || 3306;
    const user = process.env.DB_USERNAME || process.env.MYSQLUSER || 'root';
    const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
    const database = process.env.DB_DATABASE || process.env.MYSQLDATABASE || 'pranova_db';
    const userPass = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
    process.env.DATABASE_URL = `mysql://${userPass}@${host}:${port}/${database}`;
  }
}

// 2. Synchronize database schema with Prisma if DATABASE_URL is available
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost:3306')) {
  console.log('[PRANOVA Deploy] Applying schema migrations with Prisma...');
  try {
    spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
  } catch (err) {
    console.warn('[PRANOVA Deploy] Prisma db push warning:', err.message);
  }
}

// 3. Start PRANOVA Production Server
console.log('[PRANOVA Deploy] Starting PRANOVA Healthcare API Engine & Admin Web Console...');
const server = spawn('node', ['dist/server.js'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
});

server.on('exit', (code) => {
  process.exit(code ?? 0);
});
