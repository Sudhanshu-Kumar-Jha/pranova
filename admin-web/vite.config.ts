import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load the shared root .env (one file for backend + admin web).
  // Only VITE_* keys are exposed to the client bundle.
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: [
      {
        find: /^@mui\/icons-material\/(.*)/,
        replacement: '@mui/icons-material/esm/$1',
      },
    ],
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      'react-admin',
    ],
  },
  server: {
    port: 5173,
    host: true,
  },
});
