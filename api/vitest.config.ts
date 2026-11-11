import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // All test files share one test database and reset it, so they must not run at the same time.
    fileParallelism: false,
  },
});
