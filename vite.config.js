import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5000,
    strictPort: true,
    host: true,
    allowedHosts: ['github-56ff.onrender.com'],
  },
  preview: {
    port: 5000,
    strictPort: true,
    host: true,
  },
});
