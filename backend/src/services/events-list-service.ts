/**
 * Servicio de "Mis eventos" (Historia 5). Deriva el estado (en_curso/proximo/cerrado) por
 * fechas, ordena destacando los eventos en curso (los solapados van ordenados por la actividad
 * más inmediata), expone el progreso de onboarding y el punto de retorno (FR-023–FR-028).
 */
import type { Repositories } from '../repositories/index.js';
import type { EstadoEvento, Evento } from '../models/index.js';
import { derivarEstado, pasosOnboarding } from './event-status.js';
import { ApiError } from '../api/error-handler.js';

export interface EventoListado extends Evento {
  estado_derivado: EstadoEvento;
  pasos_completados: string[];
  pasos_pendientes: string[];
  actividad_actual: null; // dependencia con spec 002 (modo simplificado); en la 001 es null
  proxima_actividad_inicio: string | null;
}

export interface EventDetail extends EventoListado {
  punto_retorno: 'objetivos' | 'agenda' | 'en_curso';
}

export class EventsListService {
  constructor(private readonly repos: Repositories) {}

  private async proximaActividadInicio(eventoId: string, ahora: Date): Promise<string | null> {
    const sesiones = await this.repos.sesiones.findBy((s) => s.evento_id === eventoId);
    const futuras = sesiones
      .filter((s) => new Date(s.fin).getTime() >= ahora.getTime())
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
    return futuras[0]?.inicio ?? null;
  }

  private async decorar(evento: Evento, ahora: Date): Promise<EventoListado> {
    const pasos = pasosOnboarding(evento);
    return {
      ...evento,
      estado_derivado: derivarEstado(evento, ahora),
      pasos_completados: pasos.completados,
      pasos_pendientes: pasos.pendientes,
      actividad_actual: null,
      proxima_actividad_inicio: await this.proximaActividadInicio(evento.id, ahora),
    };
  }

  async listar(ahora: Date = new Date()): Promise<EventoListado[]> {
    const eventos = await this.repos.eventos.list();
    const decorados = await Promise.all(eventos.map((e) => this.decorar(e, ahora)));

    const orden: Record<EstadoEvento, number> = { en_curso: 0, proximo: 1, cerrado: 2 };
    return decorados.sort((a, b) => {
      if (orden[a.estado_derivado] !== orden[b.estado_derivado]) {
        return orden[a.estado_derivado] - orden[b.estado_derivado];
      }
      // Eventos en curso solapados: el de actividad más inmediata primero (caso límite spec).
      const ta = a.proxima_actividad_inicio
        ? new Date(a.proxima_actividad_inicio).getTime()
        : Number.MAX_SAFE_INTEGER;
      const tb = b.proxima_actividad_inicio
        ? new Date(b.proxima_actividad_inicio).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
      return new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime();
    });
  }

  async detalle(id: string, ahora: Date = new Date()): Promise<EventDetail> {
    const evento = await this.repos.eventos.findById(id);
    if (!evento) throw new ApiError(404, 'no_encontrado', 'Evento no encontrado');
    const base = await this.decorar(evento, ahora);
    let punto_retorno: EventDetail['punto_retorno'];
    if (base.estado_derivado === 'en_curso') punto_retorno = 'en_curso';
    else if (evento.progreso_onboarding === 'agenda_generada') punto_retorno = 'agenda';
    else punto_retorno = 'objetivos';
    return { ...base, punto_retorno };
  }
}
