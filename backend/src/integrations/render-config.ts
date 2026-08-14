/**
 * Presupuestos de tiempo, límites de recursos y de interacción del render de agendas (feature 004).
 * Valores del plan.md (Performance Goals) y research.md R4/R5; configurables por entorno, nunca por
 * la API de importación.
 */

function entero(nombre: string, porDefecto: number): number {
  const bruto = process.env[nombre];
  if (bruto === undefined) return porDefecto;
  const valor = Number(bruto);
  return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : porDefecto;
}

/** Presupuesto total (fetch ligero + render + IA) de una importación por URL (FR-008, SC-003). */
export const PRESUPUESTO_TOTAL_MS = entero('RUMBO_RENDER_TOTAL_MS', 45_000);

/** Topes de fase (plan.md). Cada fase usa además el mínimo con el tiempo global restante. */
export const LIGERA_MS = entero('RUMBO_RENDER_LIGERA_MS', 12_000);
export const RENDER_MS = entero('RUMBO_RENDER_RENDER_MS', 22_000);
export const IA_RENDER_MS = entero('RUMBO_RENDER_IA_MS', 10_000);
export const MARGEN_MS = entero('RUMBO_RENDER_MARGEN_MS', 1_000);

/** Capacidad de render concurrente y espera máxima para adquirirla (research.md R5). */
export const MAX_RENDER_CONCURRENTE = entero('RUMBO_RENDER_MAX_CONCURRENTE', 1);
export const ESPERA_CAPACIDAD_MS = entero('RUMBO_RENDER_ESPERA_CAPACIDAD_MS', 2_000);

/** Límites de interacción acotada para revelar la agenda (FR-006, research.md R4). */
export const LIMITES_INTERACCION = {
  consentimiento: entero('RUMBO_RENDER_MAX_CONSENTIMIENTO', 1),
  tabs: entero('RUMBO_RENDER_MAX_TABS', 7),
  verMas: entero('RUMBO_RENDER_MAX_VER_MAS', 5),
  scroll: entero('RUMBO_RENDER_MAX_SCROLL', 5),
  totalAcciones: entero('RUMBO_RENDER_MAX_ACCIONES', 16),
} as const;

/** Espera breve tras cada acción para detectar crecimiento de DOM/texto (no `networkidle`). */
export const ESPERA_ACCION_MS = entero('RUMBO_RENDER_ESPERA_ACCION_MS', 800);

/** ¿El subsistema de render está habilitado? Si no, la importación degrada a la vía ligera (FR-011). */
export function renderHabilitado(): boolean {
  return (process.env.RUMBO_RENDER_ENABLED ?? 'true').toLowerCase() !== 'false';
}
