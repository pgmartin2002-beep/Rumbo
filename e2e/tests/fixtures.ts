import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface SesionFixture {
  titulo: string;
  inicioH: number;
  finH: number;
  sala: string;
  tema: string | null;
}

/** Payload de importación (mismo formato que StubEventExtractionAdapter espera como JSON). */
export function eventoPayload(nombre: string, sesiones: SesionFixture[]): string {
  const ahora = Date.now();
  const h = (n: number) => new Date(ahora + n * 3600_000).toISOString();
  return JSON.stringify({
    nombre,
    fecha_inicio: h(-1),
    fecha_fin: h(24),
    ubicacion: 'Palacio de Congresos',
    sesiones: sesiones.map((s) => ({
      titulo: s.titulo,
      inicio: h(s.inicioH),
      fin: h(s.finH),
      sala: s.sala,
      tema: s.tema,
      ponentes: [],
    })),
    empresas: [],
  });
}

/**
 * Importa un evento, define un objetivo y genera la agenda (feature 001). Deja la página en
 * `/eventos/:id/agenda` y devuelve el `id` del evento para que cada spec de la feature 002
 * navegue directamente a la pantalla que necesita probar.
 */
export async function crearEventoConAgenda(
  page: Page,
  nombre: string,
  sesiones: SesionFixture[],
): Promise<string> {
  await page.goto('/importar');
  await page.getByPlaceholder(/Pega aquí/i).fill(eventoPayload(nombre, sesiones));
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();

  await page.getByRole('button', { name: /Definir mis objetivos/i }).click();
  await page.getByRole('button', { name: /Aprender/i }).click();
  await page.getByRole('button', { name: /Generar mi agenda/i }).click();
  await expect(page.getByRole('heading', { name: /Tu agenda priorizada/i })).toBeVisible();

  const match = page.url().match(/eventos\/([^/]+)\/agenda/);
  if (!match) throw new Error(`No se pudo extraer el id del evento de la URL: ${page.url()}`);
  return match[1];
}
