/**
 * Servicio de preguntas preparadas por sesión (Historia 1, FR-001–FR-004).
 */
import type { Repositories } from '../repositories/index.js';
import type { PreguntaPreparada, Sesion } from '../models/index.js';
import { ApiError } from '../api/error-handler.js';
import { validarTextoPregunta } from '../models/validation.js';
import type { QuestionGenerationAdapter } from '../integrations/question-generation.js';

export class QuestionsService {
  constructor(
    private readonly repos: Repositories,
    private readonly generador: QuestionGenerationAdapter,
  ) {}

  private async obtenerSesion(eventoId: string, sesionId: string): Promise<Sesion> {
    const sesion = await this.repos.sesiones.findById(sesionId);
    if (!sesion || sesion.evento_id !== eventoId) {
      throw new ApiError(404, 'sesion_no_encontrada', 'La sesión no existe en este evento');
    }
    return sesion;
  }

  private async nombresPonentes(ponenteIds: string[]): Promise<string[]> {
    if (ponenteIds.length === 0) return [];
    const ponentes = await this.repos.ponentes.list();
    const porId = new Map(ponentes.map((p) => [p.id, p] as const));
    return ponenteIds.map((id) => porId.get(id)?.nombre).filter((n): n is string => Boolean(n));
  }

  async listar(eventoId: string, sesionId: string): Promise<PreguntaPreparada[]> {
    await this.obtenerSesion(eventoId, sesionId);
    return this.repos.preguntas.findBy((p) => p.sesion_id === sesionId);
  }

  /** Borra las anteriores `origen: 'sugerida'` y genera un conjunto nuevo (FR-001, FR-002). */
  async generar(eventoId: string, sesionId: string): Promise<PreguntaPreparada[]> {
    const sesion = await this.obtenerSesion(eventoId, sesionId);
    const ponentes = await this.nombresPonentes(sesion.ponente_ids);
    const textos = await this.generador.generar(sesion.tema, ponentes);
    if (!textos) {
      throw new ApiError(
        422,
        'informacion_insuficiente',
        'No hay información suficiente de la sesión para generar preguntas',
      );
    }

    const anteriores = await this.repos.preguntas.findBy(
      (p) => p.sesion_id === sesionId && p.origen === 'sugerida',
    );
    for (const p of anteriores) {
      await this.repos.preguntas.delete(p.id);
    }

    const ahora = new Date().toISOString();
    for (const texto of textos) {
      await this.repos.preguntas.create({ sesion_id: sesionId, texto, origen: 'sugerida', creado_en: ahora });
    }
    return this.repos.preguntas.findBy((p) => p.sesion_id === sesionId);
  }

  async agregarManual(eventoId: string, sesionId: string, texto: unknown): Promise<PreguntaPreparada> {
    await this.obtenerSesion(eventoId, sesionId);
    validarTextoPregunta(texto);
    return this.repos.preguntas.create({
      sesion_id: sesionId,
      texto: texto.trim(),
      origen: 'manual',
      creado_en: new Date().toISOString(),
    });
  }
}
