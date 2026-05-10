import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    exclude: ['tests/**/*.spec.js', 'node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['packages/core/src/**/*.js'],
      exclude: ['node_modules', 'dist', 'tests']
    }
  }
});
