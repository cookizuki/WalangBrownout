import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
 testDir: './tests/Browser', globalSetup: './tests/Browser/setup.cjs', workers: 1, timeout: 120000,
 use: { baseURL: 'http://127.0.0.1:8011', actionTimeout: 15000, viewport: { width: 1440, height: 1000 }, launchOptions: { executablePath: existsSync(chrome) ? chrome : existsSync(edge) ? edge : undefined }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 webServer: { command: 'powershell -NoProfile -File tests/Browser/serve.ps1', url: 'http://127.0.0.1:8011/login', stderr: 'ignore', reuseExistingServer: false, timeout: 120000 },
});
