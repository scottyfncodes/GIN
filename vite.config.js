import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

// Served from https://scottyfncodes.github.io/GIN/ on GitHub Pages.
export default defineConfig({
  base: '/GIN/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILT_AT__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
  },
  test: {
    environment: 'jsdom',
  },
});
