import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    coverage: {
      reporter: ['text', 'html', 'json'],
      provider: 'v8',
      exclude: [
        'node_modules/**',
        'src/setupTests.ts',
        '**/*.d.ts',
        'cypress/**',
        'dist/**',
        '**/*.config.{js,ts}',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    include: ['src/**/*.{test,spec}.ts?(x)'],
    exclude: [
      'node_modules/**',
      'cypress/**',
      'dist/**',
      '**/*.config.{js,ts}',
    ],
  },
});
