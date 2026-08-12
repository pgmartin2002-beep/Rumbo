/**
 * Servicio de priorización de agenda (Historia 3). Cruza las sesiones del evento con el perfil
 * de objetivos, clasifica cada sesión (imprescindible/opcional/descartable), genera el motivo
 * de recomendación, detecta conflictos de horario y marca alternativas (FR-012–FR-014).
 * El recálculo se calcula como diff SIN aplicarlo hasta la confirmación (FR-015, Principio IV).
 */
import type { Repositories } from '../repositories/index.js';
import type {
  AgendaItem,
  AgendaPersonalizada,
  Objetivo,
  PrioridadAgenda,
  Sesion,
} from '../models/index.js';
import { ApiError } from '../api/error-handler.js';

export interface AgendaDiff {
  suben: string[];
  bajan: string[];
  entran: string[];
  salen: string[];
}

const PALABRAS_OBJETIVO: Record<Objetivo, string[]> = {
  aprender: ['taller', 'charla', 'keynote', 'formación', 'tutorial', 'aprende'],
  clientes: ['ventas', 'cliente', 'negocio', 'growth', 'demo'],
  empleo: ['empleo', 'carrera', 'reclut', 'talento', 'trabajo'],
  inversores: ['inversor', 'funding', 'venture', 'pitch', 'capital'],
  networking: ['networking', 'meetup', 'social', 'comunidad'],
  presentar: ['pitch', 'presenta', 'demo', 'showcase'],
  colaboradores: ['colabora', 'open source', 'partner', 'equipo'],
  disfrutar: ['fiesta', 'música', 'experiencia', 'ocio'],
};

function overlaps(a: Sesion, b: Sesion): boolean {
  return new Date(a.inicio) < new Date(b.fin) && new Date(b.inicio) < new Date(a.fin);
}

export class AgendaService {
  constructor(private readonly repos: Repositories) {}

  private async construirItems(eventoId: string): Promise<AgendaItem[]> {
    const perfil = (await this.repos.perfilesObjetivos.findBy((p) => p.evento_id === eventoId))[0];
    if (!perfil || perfil.objetivos.length === 0) {
      throw new ApiError(409, 'sin_objetivos', 'Define tus objetivos antes de generar la agenda');
    }
    const sesiones = await this.repos.sesiones.findBy((s) => s.evento_id === eventoId);

    const scored = sesiones.map((s) => {
      const texto = `${s.titulo} ${s.tema ?? ''}`.toLowerCase();
      const objetivosCoinciden = perfil.objetivos.filter((o) =>
        PALABRAS_OBJETIVO[o].some((w) => texto.includes(w)),
      );
      let prioridad: PrioridadAgenda;
      if (objetivosCoinciden.length >= 2) prioridad = 'imprescindible';
      else if (objetivosCoinciden.length === 1) prioridad = 'opcional';
      else prioridad = 'descartable';
      const motivo =
        objetivosCoinciden.length > 0
          ? `Encaja con tus objetivos: ${objetivosCoinciden.join(', ')}.`
          : 'No coincide claramente con tus objetivos declarados.';
      return { sesion: s, prioridad, motivo, objetivosCoinciden };
    });

    const items: AgendaItem[] = scored.map((sc) => ({
      sesion_id: sc.sesion.id,
      prioridad: sc.prioridad,
      motivo_recomendacion: sc.motivo,
      en_conflicto: false,
      es_alternativa_de: null,
    }));

    // Detección de conflictos de horario entre sesiones no descartables (FR-014).
    const relevantes = scored.filter((sc) => sc.prioridad !== 'descartable');
    for (let i = 0; i < relevantes.length; i++) {
      for (let j = i + 1; j < relevantes.length; j++) {
        if (overlaps(relevantes[i].sesion, relevantes[j].sesion)) {
          const gana =
            relevantes[i].objetivosCoinciden.length >= relevantes[j].objetivosCoinciden.length
              ? relevantes[i]
              : relevantes[j];
          const pierde = gana === relevantes[i] ? relevantes[j] : relevantes[i];
          const itemGana = items.find((it) => it.sesion_id === gana.sesion.id)!;
          const itemPierde = items.find((it) => it.sesion_id === pierde.sesion.id)!;
          itemGana.en_conflicto = true;
          itemPierde.en_conflicto = true;
          itemPierde.es_alternativa_de = gana.sesion.id;
        }
      }
    }
    return items;
  }

  async generar(eventoId: string): Promise<AgendaPersonalizada> {
    const items = await this.construirItems(eventoId);
    const ahora = new Date().toISOString();
    const agenda = await this.repos.agendas.upsertBy((a) => a.evento_id === eventoId, {
      evento_id: eventoId,
      items,
      generada_en: ahora,
    });
    await this.repos.eventos.update(eventoId, {
      progreso_onboarding: 'agenda_generada',
      actualizado_en: ahora,
    });
    return agenda;
  }

  async obtener(eventoId: string): Promise<AgendaPersonalizada | null> {
    return (await this.repos.agendas.findBy((a) => a.evento_id === eventoId))[0] ?? null;
  }

  /** Propuesta de recálculo como diff, SIN aplicarla (FR-015, Principio IV). */
  async proponerRecalculo(eventoId: string): Promise<AgendaDiff> {
    const actual = await this.obtener(eventoId);
    const nuevos = await this.construirItems(eventoId);
    const prioActual = new Map(
      (actual?.items ?? []).map((it) => [it.sesion_id, it.prioridad] as const),
    );
    const rank: Record<PrioridadAgenda, number> = {
      descartable: 0,
      opcional: 1,
      imprescindible: 2,
    };
    const diff: AgendaDiff = { suben: [], bajan: [], entran: [], salen: [] };
    for (const it of nuevos) {
      const antes = prioActual.get(it.sesion_id);
      if (antes === undefined) {
        if (it.prioridad !== 'descartable') diff.entran.push(it.sesion_id);
      } else if (rank[it.prioridad] > rank[antes]) diff.suben.push(it.sesion_id);
      else if (rank[it.prioridad] < rank[antes]) diff.bajan.push(it.sesion_id);
    }
    const nuevosIds = new Set(nuevos.filter((i) => i.prioridad !== 'descartable').map((i) => i.sesion_id));
    for (const it of actual?.items ?? []) {
      if (it.prioridad !== 'descartable' && !nuevosIds.has(it.sesion_id)) diff.salen.push(it.sesion_id);
    }
    return diff;
  }

  /** Aplica el recálculo solo tras confirmación explícita del usuario (FR-015, Principio IV). */
  async aplicarRecalculo(eventoId: string): Promise<AgendaPersonalizada> {
    return this.generar(eventoId);
  }
}
