import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/** Integration tests need a real database (TEST_DATABASE_URL, npm run db:up). */
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['src/**/*.int.spec.ts'],
    testTimeout: 30_000,
    fileParallelism: false, // the files share one test database
  },
});
