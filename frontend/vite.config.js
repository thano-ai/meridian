import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function apiProxy(target = 'http://localhost:3000') {
  return {
    target,
    bypass(req) {
      // Let the React app handle hidden UI pages (discovery); API POSTs still proxy
      if (
        req.method === 'GET' &&
        (req.url?.startsWith('/hidden/flag-submit') ||
          req.url?.startsWith('/hidden/verify') ||
          req.url?.startsWith('/internal/flag-submission') ||
          req.url?.startsWith('/internal/audit/verify'))
      ) {
        return '/index.html';
      }
    },
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/hidden': apiProxy(),
      '/internal': apiProxy(),
      '/backup': 'http://localhost:3000',
      '/config': 'http://localhost:3000',
      '/dev': 'http://localhost:3000',
      '/administration': 'http://localhost:3000',
      '/testing': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});
