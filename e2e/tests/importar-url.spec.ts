import { test, expect } from '@playwright/test';
import { limpiarDatosE2E } from './reset-data.js';

/**
 * Validación E2E de la Feature 003 (quickstart.md, Escenario 2 — pasos 2 y 3): el bloqueo SSRF
 * de la importación por URL (FR-013) se ejercita de punta a punta contra el backend real. El
 * servidor de test arranca con una `ANTHROPIC_API_KEY` no funcional (playwright.config.ts) solo
 * para que el pipeline llegue al bloqueo SSRF en vez de degradar antes por falta de clave — esa
 * degradación (FR-012) ya está cubierta de forma determinista en `backend/tests/event-extraction.test.ts`.
 * Ningún caso de este archivo llega a hacer una petición de red real (research.md R10).
 *
 * Feature 004: el render se arranca deshabilitado en E2E (RUMBO_RENDER_ENABLED=false,
 * playwright.config.ts) para no lanzar un navegador real por test; el estado `fuente_ilegible`
 * que valida este archivo cubre también la ruta ligera cuando el render no interviene.
 */
test.describe.configure({ mode: 'serial' });
test.beforeAll(limpiarDatosE2E);

test('bloquea una URL que apunta a localhost (destino interno)', async ({ page }) => {
  await page.goto('/importar');
  await page.getByPlaceholder(/Pega aquí/i).fill('http://127.0.0.1:9/interno');
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByText(/No hemos podido extraer datos/i)).toBeVisible();
});

test('bloquea una URL que apunta al endpoint de metadatos de nube', async ({ page }) => {
  await page.goto('/importar');
  await page.getByPlaceholder(/Pega aquí/i).fill('http://169.254.169.254/latest/meta-data/');
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByText(/No hemos podido extraer datos/i)).toBeVisible();
});

test('una URL bloqueada no crea ningún evento parcial', async ({ page }) => {
  await page.goto('/');
  const eventosAntes = await page.getByRole('heading', { level: 2 }).count();

  await page.goto('/importar');
  await page.getByPlaceholder(/Pega aquí/i).fill('http://169.254.169.254/');
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByText(/No hemos podido extraer datos/i)).toBeVisible();

  await page.goto('/');
  const eventosDespues = await page.getByRole('heading', { level: 2 }).count();
  expect(eventosDespues).toBe(eventosAntes);
});
