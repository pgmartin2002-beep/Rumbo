import { test, expect } from '@playwright/test';
import { limpiarDatosE2E } from './reset-data.js';
import { crearEventoConAgenda } from './fixtures.js';

/**
 * Validación E2E de la Historia 1 (feature 002): preguntas preparadas por sesión.
 * Cubre quickstart.md Escenario 1 y las Escenarios de aceptación 1–4 de spec.md.
 */
test.describe.configure({ mode: 'serial' });
test.beforeAll(limpiarDatosE2E);

test('Historia 1: preguntas sugeridas, regenerar, manual e información insuficiente', async ({ page }) => {
  await crearEventoConAgenda(page, 'Preguntas E2E', [
    {
      titulo: 'Taller de IA',
      inicioH: 1,
      finH: 2,
      sala: 'A',
      tema: 'inteligencia artificial machine learning',
    },
    { titulo: 'Sesión sin tema', inicioH: 3, finH: 4, sala: 'B', tema: null },
  ]);

  // AC1/AC2: con tema, se generan preguntas estructuradas (4 sugeridas: estratégicas y técnicas).
  await page.getByRole('link', { name: /Taller de IA/i }).click();
  await expect(page.getByRole('heading', { name: 'Taller de IA' })).toBeVisible();
  
  // Botón inicial "Generar preguntas"
  await page.getByRole('button', { name: /Generar preguntas/i }).click();
  await expect(page.getByText('Sugerida').first()).toBeVisible();
  await expect(page.getByText('Estratégica').first()).toBeVisible();
  await expect(page.getByText('Técnica').first()).toBeVisible();

  // AC1: preguntas relacionadas con el tema declarado.
  await expect(page.getByText(/inteligencia artificial|machine learning/i).first()).toBeVisible();

  // AC4: una pregunta manual convive con las sugeridas y persiste al volver a consultar.
  await page.getByPlaceholder(/Escribe una pregunta/i).fill('¿Cuál es tu framework favorito?');
  await page.getByRole('button', { name: /Añadir pregunta/i }).click();
  await expect(page.getByText('¿Cuál es tu framework favorito?')).toBeVisible();
  await expect(page.getByText('Tuya').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('¿Cuál es tu framework favorito?')).toBeVisible();
  await expect(page.getByText('Sugerida').first()).toBeVisible();

  // US2: regenerar preguntas mantiene la manual y sustituye las sugeridas.
  await page.getByRole('button', { name: /Regenerar preguntas/i }).click();
  await expect(page.getByText('¿Cuál es tu framework favorito?')).toBeVisible();
  await expect(page.getByText('Tuya').first()).toBeVisible();

  // AC3: sin tema suficiente, la app informa y permite seguir creando preguntas a mano.
  await page.getByRole('link', { name: /^Agenda$/i }).click();
  await page.getByRole('link', { name: /Sesión sin tema/i }).click();
  await page.getByRole('button', { name: /Generar preguntas/i }).click();
  await expect(page.getByText(/no hay información suficiente/i)).toBeVisible();
  await page.getByPlaceholder(/Escribe una pregunta/i).fill('¿De qué va esta sesión?');
  await page.getByRole('button', { name: /Añadir pregunta/i }).click();
  await expect(page.getByText('¿De qué va esta sesión?')).toBeVisible();
});
