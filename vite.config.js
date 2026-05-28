import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/Golden-vault-financial-dashboard/' // Must start and end with /
});
