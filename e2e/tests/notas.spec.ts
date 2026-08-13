import { test, expect } from '@playwright/test';
import { limpiarDatosE2E } from './reset-data.js';
import { crearEventoConAgenda } from './fixtures.js';

/**
 * Validación E2E de la Historia 3 (feature 002): notas vinculadas a la sesión activa.
 * Cubre quickstart.md Escenario 3: creación, edición, huecos con reasignación manual, eliminación
 * y captura sin conexión con sincronización posterior (FR-017, SC-006).
 */
test.describe.configure({ mode: 'serial' });
test.beforeAll(limpiarDatosE2E);

test('Historia 3: notas, edición, hueco reasignable, eliminación y captura offline', async ({ page }) => {
  const base = Date.now();
  const h = (n: number) => base + n * 3600_000;

  await crearEventoConAgenda(page, 'Notas E2E', [
    { titulo: 'Sesión con notas', inicioH: -0.5, finH: 1, sala: 'A', tema: 'notas' },
    { titulo: 'Siguiente sesión', inicioH: 2, finH: 3, sala: 'B', tema: 'notas' },
  ]);
  const match = page.url().match(/eventos\/([^/]+)\/agenda/);
  const eventoId = match![1];

  // AC1: nota de texto vinculada automáticamente a la sesión activa.
  await page.clock.install({ time: h(0) });
  await page.goto(`/eventos/${eventoId}/notas`);
  await expect(page.getByText(/Se vincularán a: Sesión con notas/i)).toBeVisible();
  await page.getByPlaceholder(/Escribe una nota/i).fill('Idea interesante sobre el tema');
  await page.getByRole('button', { name: /Guardar nota/i }).click();
  await expect(page.getByText('Idea interesante sobre el tema')).toBeVisible();
  await expect(page.getByText('Sesión con notas').nth(1)).toBeVisible();

  // AC3: editar la nota.
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.locator('textarea.payload-input').last().fill('Idea revisada sobre el tema');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Idea revisada sobre el tema')).toBeVisible();

  // AC4: nota creada en un hueco queda vinculada al evento en general y se puede reasignar.
  await page.clock.setFixedTime(h(1.5));
  await page.goto(`/eventos/${eventoId}/notas`);
  await page.getByPlaceholder(/Escribe una nota/i).fill('Nota sin sesión activa');
  await page.getByRole('button', { name: /Guardar nota/i }).click();
  await expect(page.getByText('Nota sin sesión activa')).toBeVisible();
  await expect(page.getByText('Evento en general').first()).toBeVisible();
  await page.getByRole('combobox').selectOption({ label: 'Siguiente sesión' });
  await expect(
    page.locator('.pass').filter({ hasText: 'Nota sin sesión activa' }).getByText('Siguiente sesión'),
  ).toBeVisible();

  // SC-006: capturada sin conexión, se muestra como pendiente y se sincroniza al recuperarla.
  await page.context().setOffline(true);
  await page.getByPlaceholder(/Escribe una nota/i).fill('Nota capturada sin conexión');
  await page.getByRole('button', { name: /Guardar nota/i }).click();
  await expect(page.getByText(/pendiente.*sincronizar/i)).toBeVisible();
  await page.context().setOffline(false);
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByText('Nota capturada sin conexión')).toBeVisible();
  await expect(page.getByText(/pendiente.*sincronizar/i)).not.toBeVisible();

  // AC3: eliminar una nota.
  await page
    .locator('.pass')
    .filter({ hasText: 'Idea revisada sobre el tema' })
    .getByRole('button', { name: 'Eliminar' })
    .click();
  await expect(page.getByText('Idea revisada sobre el tema')).not.toBeVisible();
});
