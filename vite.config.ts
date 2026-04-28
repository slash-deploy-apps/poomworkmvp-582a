import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: { protocol: 'wss', clientPort: 443 },
    allowedHosts: ['.e2b.app', '.slash.ai.kr', 'localhost'],
    watch: { ignored: ['**/node_modules/**', '**/.git/**'] },
  },
});
