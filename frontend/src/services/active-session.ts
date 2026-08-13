/**
 * Calcula la sesión activa / el hueco / el estado "evento no activo" a partir de una agenda ya
 * obtenida, sin llamar a la red (research.md R5). Es la única fuente de verdad de "qué toca
 * ahora": la usan tanto el modo simplificado (Historia 2) como la creación de notas y contactos
 * (Historia 3 y 4, research.md R7) para decidir a qué sesión vincular lo que el usuario capture.
 */
import type { Agenda, AgendaItem, PrioridadAgenda } from './types.js';

export type EstadoModoSimplificado =
  | { estado: 'sesion_activa'; item: AgendaItem }
  | { estado: 'hueco'; proxima: AgendaItem | null }
  | { estado: 'no_activo'; primera: AgendaItem | null; ultima: AgendaItem | null; posicion: 'antes' | 'despues' };

const RANK_PRIORIDAD: Record<PrioridadAgenda, number> = {
  imprescindible: 2,
  opcional: 1,
  descartable: 0,
};

function itemsConSesion(agenda: Agenda): (AgendaItem & { sesion: NonNullable<AgendaItem['sesion']> })[] {
  return agenda.items.filter(
    (it): it is AgendaItem & { sesion: NonNullable<AgendaItem['sesion']> } => it.sesion !== null,
  );
}

function ordenarPorInicio<T extends { sesion: NonNullable<AgendaItem['sesion']> }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.sesion.inicio).getTime() - new Date(b.sesion.inicio).getTime());
}

/**
 * FR-005–FR-007: sesión activa, hueco con próxima actividad, o evento no activo con la primera o
 * última actividad. FR-018: si varias sesiones se solapan en `ahora`, se queda con la de mayor
 * prioridad entre las que no están marcadas como alternativa de otra (contracts con AgendaService,
 * feature 001). Si el marcado dejara el grupo vacío (solape de 3+ sesiones, fuera del alcance de la
 * aclaración de sesión 2026-08-12), usa el grupo completo como salvaguarda.
 */
export function sesionActiva(agenda: Agenda, ahora: Date = new Date()): EstadoModoSimplificado {
  const items = ordenarPorInicio(itemsConSesion(agenda));

  if (items.length === 0) {
    return { estado: 'no_activo', primera: null, ultima: null, posicion: 'antes' };
  }

  const t = ahora.getTime();
  const activas = items.filter(
    (it) => new Date(it.sesion.inicio).getTime() <= t && t < new Date(it.sesion.fin).getTime(),
  );

  if (activas.length > 0) {
    let candidatas = activas.filter((it) => it.es_alternativa_de === null);
    if (candidatas.length === 0) candidatas = activas;
    const [ganadora] = [...candidatas].sort((a, b) => {
      const porPrioridad = RANK_PRIORIDAD[b.prioridad] - RANK_PRIORIDAD[a.prioridad];
      if (porPrioridad !== 0) return porPrioridad;
      return new Date(a.sesion.inicio).getTime() - new Date(b.sesion.inicio).getTime();
    });
    return { estado: 'sesion_activa', item: ganadora };
  }

  const primera = items[0];
  const ultima = items[items.length - 1];

  if (t < new Date(primera.sesion.inicio).getTime()) {
    return { estado: 'no_activo', primera, ultima, posicion: 'antes' };
  }
  if (t >= new Date(ultima.sesion.fin).getTime()) {
    return { estado: 'no_activo', primera, ultima, posicion: 'despues' };
  }

  const proxima = items.find((it) => new Date(it.sesion.inicio).getTime() > t) ?? null;
  return { estado: 'hueco', proxima };
}

/**
 * research.md R7: el `sesion_id` (o `null`) que debe enviarse al crear una nota o un contacto es
 * el que el propio cliente ya está mostrando como "sesión activa", nunca uno recalculado por el
 * backend a partir de su reloj.
 */
export function sesionIdActual(agenda: Agenda | null, ahora: Date = new Date()): string | null {
  if (!agenda) return null;
  const estado = sesionActiva(agenda, ahora);
  return estado.estado === 'sesion_activa' ? estado.item.sesion_id : null;
}
