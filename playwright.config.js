import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './',
    testMatch: '*.spec.js',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:8000',
        headless: false, // Opens a real browser window so you can see it run
    },
});