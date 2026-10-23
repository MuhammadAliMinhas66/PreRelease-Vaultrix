import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // These tests only cover pure logic (i18n dictionaries, the server
    // message -> translation key map) - no React component rendering, so
    // there's no need for jsdom/happy-dom here.
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.js'],
  },
});
