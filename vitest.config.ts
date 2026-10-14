import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Frontend unit tests for pure helpers. Component rendering is verified
// manually in a browser (see README) — no DOM environment is configured here.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
})
