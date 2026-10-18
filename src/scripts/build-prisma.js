const { spawnSync } = require('child_process');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.MYSQL_URL || 'mysql://build:build@localhost:3306/pranova_db';
}

console.log('[PRANOVA Build] Generating Prisma Client (target: Linux/Native)...');
const result = spawnSync('npx', ['prisma', 'generate'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (result.status !== 0 && process.platform !== 'win32') {
  console.error('[PRANOVA Build] Prisma Client generation failed with status:', result.status);
  process.exit(result.status || 1);
}
console.log('[PRANOVA Build] Prisma Client generated successfully.');
