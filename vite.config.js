import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5000,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5000,
    strictPort: true,
    host: true,
  },
});
