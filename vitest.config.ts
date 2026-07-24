import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // A headless Milkdown Editor needs a DOM (document, window, DOMParser).
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts'],
    // The lk CLI tests spawn real subprocesses that do git + canonicalisation
    // work; the default 5s budget is too tight under full-suite parallelism,
    // especially on loaded CI runners. Give tests and setup hooks more room.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
