import { test, expect } from '@playwright/test';
import { limpiarDatosE2E } from './reset-data.js';
import { crearEventoConAgenda } from './fixtures.js';

/**
 * Validación E2E de la Historia 2 (feature 002): modo simplificado.
 * Cubre quickstart.md Escenario 2 y las Escenarios de aceptación 1–4 de spec.md, más el solape
 * de sesiones (FR-018). Usa `page.clock` para fijar la hora del navegador y no depender de
 * esperas reales entre los distintos momentos del día que se comprueban.
 */
test.describe.configure({ mode: 'serial' });
test.beforeAll(limpiarDatosE2E);

test('Historia 2: sesión activa, hueco, fuera de horario y solape resuelto por prioridad', async ({
  page,
}) => {
  const base = Date.now();
  const h = (n: number) => base + n * 3600_000;

  await crearEventoConAgenda(page, 'Modo Simplificado E2E', [
    { titulo: 'Charla de apertura', inicioH: 1, finH: 2, sala: 'Auditorio', tema: 'apertura' },
    {
      titulo: 'Sesión A (solape)',
      inicioH: 3,
      finH: 4,
      sala: 'Sala 1',
      tema: 'taller práctico y charla informal',
    },
    { titulo: 'Sesión B (solape)', inicioH: 3, finH: 4, sala: 'Sala 2', tema: null },
    { titulo: 'Cierre', inicioH: 6, finH: 7, sala: 'Auditorio', tema: 'cierre' },
  ]);

  const match = page.url().match(/eventos\/([^/]+)\/agenda/);
  const eventoId = match![1];

  // AC1: dentro del horario de "Charla de apertura", la muestra con su sala.
  await page.clock.install({ time: h(1.5) });
  await page.goto(`/eventos/${eventoId}/ahora`);
  await expect(page.getByText('Charla de apertura')).toBeVisible();
  await expect(page.getByText('Auditorio').first()).toBeVisible();

  // AC3: hueco entre "Charla de apertura" y las sesiones solapadas.
  await page.clock.setFixedTime(h(2.5));
  await page.goto(`/eventos/${eventoId}/ahora`);
  await expect(page.getByText(/no tienes nada agendado ahora mismo/i)).toBeVisible();
  await expect(page.getByText(/Próxima actividad/i)).toBeVisible();

  // FR-018: dos sesiones solapadas → se muestra la de mayor prioridad ("Sesión A", imprescindible).
  await page.clock.setFixedTime(h(3.5));
  await page.goto(`/eventos/${eventoId}/ahora`);
  await expect(page.getByText('Sesión A (solape)')).toBeVisible();
  await expect(page.getByText('Sesión B (solape)')).not.toBeVisible();

  // AC4: antes de que empiece el evento.
  await page.clock.setFixedTime(h(-2));
  await page.goto(`/eventos/${eventoId}/ahora`);
  await expect(page.getByText(/evento no está activo/i)).toBeVisible();
  await expect(page.getByText(/Primera actividad/i)).toBeVisible();

  // AC4: después de que termine el evento.
  await page.clock.setFixedTime(h(10));
  await page.goto(`/eventos/${eventoId}/ahora`);
  await expect(page.getByText(/evento no está activo/i)).toBeVisible();
  await expect(page.getByText(/Última actividad/i)).toBeVisible();
});
