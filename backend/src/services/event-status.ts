import type { EstadoEvento, Evento } from '../models/index.js';

/** Estado derivado del evento a partir de sus fechas (FR-024). */
export function derivarEstado(evento: Evento, ahora: Date = new Date()): EstadoEvento {
  const inicio = new Date(evento.fecha_inicio).getTime();
  const fin = new Date(evento.fecha_fin).getTime();
  const t = ahora.getTime();
  if (t < inicio) return 'proximo';
  if (t > fin) return 'cerrado';
  return 'en_curso';
}

/** Pasos de onboarding completados y pendientes (FR-026). */
export function pasosOnboarding(evento: Evento): {
  completados: string[];
  pendientes: string[];
} {
  const orden = ['importado', 'objetivos_definidos', 'agenda_generada'] as const;
  const idx = orden.indexOf(evento.progreso_onboarding);
  return {
    completados: orden.slice(0, idx + 1).map(String),
    pendientes: orden.slice(idx + 1).map(String),
  };
}
