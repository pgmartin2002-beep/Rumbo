/**
 * Servicio de importación de eventos (Historia 1). Invoca el adaptador de extracción,
 * mapea la fuente a entidades (Evento, Sesión, Ponente, Empresa) y calcula los campos que
 * no se pudieron extraer (FR-006, FR-007).
 */
import { esUrlPublicaCandidata, type EventExtractionAdapter } from '../integrations/event-extraction.js';
import type { Repositories } from '../repositories/index.js';
import type { Evento, FuenteImportacion, RolEmpresa } from '../models/index.js';
import { ApiError } from '../api/error-handler.js';

export interface ImportResult {
  evento: Evento;
  campos_faltantes: string[];
}

export class ImportService {
  constructor(
    private readonly repos: Repositories,
    private readonly extractor: EventExtractionAdapter,
  ) {}

  async importar(fuente: FuenteImportacion, payload: string): Promise<ImportResult> {
    const datos = await this.extractor.extraer(fuente, payload);
    if (datos === null) {
      throw new ApiError(422, 'fuente_ilegible', 'No se pudieron extraer datos de la fuente');
    }

    const ahora = new Date().toISOString();
    const camposFaltantes: string[] = [];
    if (!datos.nombre) camposFaltantes.push('nombre');
    if (!datos.fecha_inicio) camposFaltantes.push('fecha_inicio');
    if (!datos.fecha_fin) camposFaltantes.push('fecha_fin');
    if (!datos.ubicacion) camposFaltantes.push('ubicacion');
    if (datos.sesiones.length === 0) camposFaltantes.push('sesiones');

    const evento = await this.repos.eventos.create({
      nombre: datos.nombre ?? 'Evento sin título',
      fecha_inicio: datos.fecha_inicio ?? ahora,
      fecha_fin: datos.fecha_fin ?? datos.fecha_inicio ?? ahora,
      ubicacion: datos.ubicacion,
      requisitos_acceso: datos.requisitos_acceso,
      fuente_importacion: fuente,
      fuente_valor: esUrlPublicaCandidata(payload) ? payload.trim() : null,
      progreso_onboarding: 'importado',
      creado_en: ahora,
      actualizado_en: ahora,
    });

    for (const s of datos.sesiones) {
      const ponenteIds: string[] = [];
      for (const p of s.ponentes) {
        const existentes = await this.repos.ponentes.findBy(
          (x) => x.nombre === p.nombre && x.empresa === p.empresa,
        );
        const ponente =
          existentes[0] ?? (await this.repos.ponentes.create({ nombre: p.nombre, empresa: p.empresa }));
        ponenteIds.push(ponente.id);
      }
      await this.repos.sesiones.create({
        evento_id: evento.id,
        titulo: s.titulo,
        inicio: s.inicio,
        fin: s.fin,
        sala: s.sala,
        tema: s.tema,
        ponente_ids: ponenteIds,
      });
    }

    for (const e of datos.empresas) {
      await this.repos.empresas.create({
        evento_id: evento.id,
        nombre: e.nombre,
        rol: (e.rol as RolEmpresa | null) ?? null,
      });
    }

    return { evento, campos_faltantes: camposFaltantes };
  }

  /** Completa o corrige manualmente datos del evento (FR-008). */
  async actualizarEvento(
    id: string,
    patch: Partial<Omit<Evento, 'id' | 'creado_en'>>,
  ): Promise<Evento> {
    const evento = await this.repos.eventos.update(id, {
      ...patch,
      actualizado_en: new Date().toISOString(),
    });
    if (!evento) throw new ApiError(404, 'no_encontrado', 'Evento no encontrado');
    return evento;
  }
}
