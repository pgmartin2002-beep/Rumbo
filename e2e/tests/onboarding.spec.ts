import { test, expect } from '@playwright/test';
import { limpiarDatosE2E } from './reset-data.js';

/**
 * Validación E2E de la Feature 001 (quickstart.md, escenarios 1–6).
 * Cubre los criterios de éxito SC-001…SC-009 y los principios constitucionales
 * IV (confirmación explícita), VI (el frontend solo habla con /api) y VIII (estados visibles).
 *
 * Se ejecuta en serie porque los escenarios comparten el estado del backend
 * (importar → objetivos → agenda → logística) sobre un directorio de datos limpio.
 * `beforeAll` deja el directorio vacío para este archivo en concreto, independientemente del
 * orden en que Playwright ejecute el resto de `*.spec.ts` de la feature 002.
 */
test.describe.configure({ mode: 'serial' });
test.beforeAll(limpiarDatosE2E);

function eventoPayload(): string {
  const ahora = Date.now();
  const h = (n: number) => new Date(ahora + n * 3600_000).toISOString();
  return JSON.stringify({
    nombre: 'TechConf E2E',
    fecha_inicio: h(-1),
    fecha_fin: h(24),
    ubicacion: 'Palacio de Congresos',
    sesiones: [
      { titulo: 'Taller de networking', inicio: h(1), fin: h(2), sala: 'A', tema: 'networking meetup comunidad', ponentes: [] },
      { titulo: 'Pitch a inversores', inicio: h(1), fin: h(2), sala: 'B', tema: 'pitch venture capital networking', ponentes: [] },
      { titulo: 'Cena de gala', inicio: h(5), fin: h(6), sala: 'C', tema: 'ocio', ponentes: [] },
    ],
    empresas: [],
  });
}

test('Escenario 6 (inicio): estado de bienvenida sin eventos', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Bienvenido a Rumbo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Añadir mi primer evento/i })).toBeVisible();
});

test('Escenario 1b: una fuente ilegible lleva al illegible-card, no a un error bloqueante', async ({ page }) => {
  await page.goto('/importar');
  await page.getByPlaceholder(/Pega aquí/i).fill('illegible');
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByText(/No hemos podido extraer datos/i)).toBeVisible();
});

test('Escenarios 1–5: importar → objetivos → agenda priorizada → recálculo confirmado → logística', async ({ page }) => {
  // Principio VI: el frontend solo debe llamar a /api, nunca a dominios externos.
  const llamadasExternas: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) llamadasExternas.push(req.url());
  });

  // Escenario 1: importar un evento.
  await page.goto('/importar');
  await page.getByPlaceholder(/Pega aquí/i).fill(eventoPayload());
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByRole('heading', { name: 'TechConf E2E' })).toBeVisible();

  // Escenario 2: definir objetivos (selección múltiple).
  await page.getByRole('button', { name: /Definir mis objetivos/i }).click();
  await expect(page.getByRole('heading', { name: /¿Qué buscas conseguir\?/i })).toBeVisible();
  await page.getByRole('button', { name: /Networking/i }).click();
  await page.getByRole('button', { name: /Inversores/i }).click();
  await page.getByRole('button', { name: /Generar mi agenda/i }).click();

  // Escenario 3: agenda priorizada con conflicto de horario señalado.
  await expect(page.getByRole('heading', { name: /Tu agenda priorizada/i })).toBeVisible();
  await expect(page.getByText(/Encaja con tus objetivos/i).first()).toBeVisible();
  await expect(page.getByText(/Conflicto de horario/i).first()).toBeVisible();

  // Escenario 4: recálculo con confirmación explícita (Principio IV).
  await page.getByRole('button', { name: /ver agenda recalculada/i }).click();
  await expect(page.getByRole('dialog', { name: /Propuesta de recálculo de agenda/i })).toBeVisible();
  // La agenda NO cambia si el usuario no confirma: descartamos la propuesta.
  await page.getByRole('button', { name: /Mantener la actual/i }).click();
  await expect(page.getByRole('dialog', { name: /Propuesta de recálculo de agenda/i })).toHaveCount(0);

  // Escenario 5: logística — ruta y hora de salida.
  await page.getByRole('button', { name: /Preparar logística/i }).click();
  await expect(page.getByRole('heading', { name: /Tu ruta al evento/i })).toBeVisible();
  await page.getByPlaceholder(/Punto de origen/i).fill('Hotel Centro');
  await page.getByRole('button', { name: /Calcular ruta/i }).click();
  await expect(page.getByText(/Hora de salida recomendada/i)).toBeVisible();
  await expect(page.getByText(/min de trayecto/i).first()).toBeVisible();

  // Principio VI: no debe haberse hecho ninguna petición fuera de localhost.
  expect(llamadasExternas, `Llamadas externas detectadas: ${llamadasExternas.join(', ')}`).toEqual([]);
});

test('Escenario 6 (con datos): Mis eventos lista el evento en curso destacado', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Tus eventos/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TechConf E2E' })).toBeVisible();
  await expect(page.getByText('En curso').first()).toBeVisible();
});
