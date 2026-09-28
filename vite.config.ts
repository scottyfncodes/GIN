import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// Served from https://scottyfncodes.github.io/GIN/ on GitHub Pages.
export default defineConfig({
  base: '/GIN/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    environment: 'jsdom',
  },
});
