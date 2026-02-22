import { defineConfig } from 'vitest/config';
import path from 'path';

/** @type {import('vitest').UserConfig} */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
        '.next/',
        'coverage/',
        'prisma/',
        'scripts/',
        'types/',
        'e2e/',
      ],
      // Configuration for reports
      reportsDirectory: './coverage',
      // Include all source files in coverage
      all: true,
    },
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/',
      '.next/',
      'dist/',
      'build/',
      'e2e/',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
