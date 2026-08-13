import { test, expect } from '@playwright/test';
import { limpiarDatosE2E } from './reset-data.js';
import { crearEventoConAgenda } from './fixtures.js';

/**
 * Validación E2E de la Historia 4 (feature 002): registrar contactos.
 * Cubre quickstart.md Escenario 4: registro con sesión activa, edición de nota, evento en
 * general sin sesión activa, aviso de posible duplicado con fusión explícita (Principio IV) y
 * contacto guardado solo con el nombre (aclaración de sesión 2026-08-12).
 */
test.describe.configure({ mode: 'serial' });
test.beforeAll(limpiarDatosE2E);

test('Historia 4: registrar, editar, evento en general, duplicados y contacto sin nota', async ({
  page,
}) => {
  const base = Date.now();
  const h = (n: number) => base + n * 3600_000;

  await crearEventoConAgenda(page, 'Contactos E2E', [
    { titulo: 'Sesión con contactos', inicioH: -0.5, finH: 1, sala: 'A', tema: 'contactos' },
  ]);
  const match = page.url().match(/eventos\/([^/]+)\/agenda/);
  const eventoId = match![1];

  // AC1/AC2: registrar contacto durante una sesión activa, con nombre y nota.
  await page.clock.install({ time: h(0) });
  await page.goto(`/eventos/${eventoId}/personas`);
  await expect(page.getByText(/Se vincularán a: Sesión con contactos/i)).toBeVisible();
  await page.getByPlaceholder('Nombre').fill('Marta Ruiz');
  await page.getByPlaceholder(/Nota rápida/i).fill('Habla de IA en salud');
  await page.getByRole('button', { name: /Registrar contacto/i }).click();
  await expect(page.getByText('Marta Ruiz')).toBeVisible();
  await expect(page.getByText('Habla de IA en salud')).toBeVisible();
  await expect(
    page.locator('.pass').filter({ hasText: 'Marta Ruiz' }).getByText('Sesión con contactos'),
  ).toBeVisible();

  // AC3: editar la nota; el resto de datos del contacto se mantiene.
  await page
    .locator('.pass')
    .filter({ hasText: 'Marta Ruiz' })
    .getByRole('button', { name: 'Editar nota' })
    .click();
  await page.locator('textarea.payload-input').last().fill('Habla de IA en salud, sigue en LinkedIn');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Habla de IA en salud, sigue en LinkedIn')).toBeVisible();
  await expect(page.getByText('Marta Ruiz')).toBeVisible();

  // AC4: fuera de la sesión, el contacto se asocia al evento en general.
  await page.clock.setFixedTime(h(3));
  await page.goto(`/eventos/${eventoId}/personas`);
  await page.getByPlaceholder('Nombre').fill('Diego Soto');
  await page.getByRole('button', { name: /Registrar contacto/i }).click();
  await expect(page.getByText('Diego Soto')).toBeVisible();
  await expect(
    page.locator('.pass').filter({ hasText: 'Diego Soto' }).getByText('Evento en general'),
  ).toBeVisible();

  // AC5: nombre parecido → aviso de posible duplicado; la fusión requiere confirmación explícita.
  await page.getByPlaceholder('Nombre').fill('Marta Ruiz ');
  await page.getByRole('button', { name: /Registrar contacto/i }).click();
  await expect(page.getByRole('dialog', { name: 'Posible contacto duplicado' })).toBeVisible();
  await page.getByRole('button', { name: /Fusionar/i }).click();
  await expect(page.getByRole('dialog', { name: 'Posible contacto duplicado' })).toHaveCount(0);
  await expect(page.getByText('Marta Ruiz', { exact: true })).toHaveCount(1);

  // FR-011 / aclaración de sesión 2026-08-12: la nota es opcional, el contacto se guarda igual.
  await page.getByPlaceholder('Nombre').fill('Ana');
  await page.getByRole('button', { name: /Registrar contacto/i }).click();
  await expect(page.getByText('Sin nota todavía.').first()).toBeVisible();
});
