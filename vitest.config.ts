import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Characterization / unit tests for the pure engine only.
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
