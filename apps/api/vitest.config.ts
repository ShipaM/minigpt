import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Nest needs SWC: it emits decorator type metadata (DI by constructor types).
  plugins: [swc.vite()],

  test: {
    include: ['src/**/*.spec.ts'],

    // Integration tests need a real database: they run separately (npm run test:int).
    exclude: ['src/**/*.int.spec.ts', '**/node_modules/**'],
  },
});
