import '../config/env.config.js';
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 0);
