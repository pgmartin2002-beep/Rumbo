import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '.e2e-data');

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: [
    {
      command: 'npm --prefix ../backend run start',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: '3001',
        RUMBO_DATA_DIR: dataDir,
        // Clave no funcional: solo para que el pipeline de extracción por URL (feature 003) no
        // degrade antes de llegar al bloqueo SSRF (research.md R10) — nunca llega a red real
        // porque el bloqueo corta la petición antes de invocar a Anthropic.
        ANTHROPIC_API_KEY: 'e2e-fake-key-do-not-use',
        // Render (feature 004) deshabilitado en E2E: evita lanzar un navegador real por test y
        // mantiene deterministas los casos SSRF/ilegible. El fallback de render se cubre en los
        // tests de backend (event-extraction.test.ts).
        RUMBO_RENDER_ENABLED: 'false',
      },
    },
    {
      command: 'npm --prefix ../frontend run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
