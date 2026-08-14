/**
 * Servicio de preguntas preparadas por sesión (Historia 1, FR-001–FR-004, FR-005, FR-006).
 */
import type { Repositories } from '../repositories/index.js';
import type { PreguntaPreparada, Sesion, Ponente } from '../models/index.js';
import { ApiError } from '../api/error-handler.js';
import { validarTextoPregunta } from '../models/validation.js';
import type {
  QuestionGenerationAdapter,
  ContextoGeneracionPreguntas,
} from '../integrations/question-generation.js';

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

  private async obtenerPonentes(
    ponenteIds: string[],
  ): Promise<{ nombre: string; empresa: string | null }[]> {
    if (ponenteIds.length === 0) return [];
    const ponentes = await this.repos.ponentes.list();
    const porId = new Map(ponentes.map((p) => [p.id, p] as const));
    return ponenteIds
      .map((id) => porId.get(id))
      .filter((p): p is Ponente => Boolean(p))
      .map((p) => ({ nombre: p.nombre, empresa: p.empresa }));
  }

  async listar(eventoId: string, sesionId: string): Promise<PreguntaPreparada[]> {
    await this.obtenerSesion(eventoId, sesionId);
    return this.repos.preguntas.findBy((p) => p.sesion_id === sesionId);
  }

  /**
   * Borra las anteriores `origen: 'sugerida'` (preservando intactas las `origen: 'manual'`)
   * y genera exactamente 4 preguntas estructuradas con el LLM (FR-001–FR-006).
   */
  async generar(eventoId: string, sesionId: string): Promise<PreguntaPreparada[]> {
    const sesion = await this.obtenerSesion(eventoId, sesionId);

    if (!sesion.tema || !sesion.tema.trim()) {
      throw new ApiError(
        422,
        'informacion_insuficiente',
        'No hay información suficiente de la sesión para generar preguntas',
      );
    }

    const evento = await this.repos.eventos.findById(eventoId);
    const ponentes = await this.obtenerPonentes(sesion.ponente_ids);
    const perfiles = await this.repos.perfilesObjetivos.findBy((po) => po.evento_id === eventoId);
    const objetivosUsuario = perfiles.length > 0 ? perfiles[0].objetivos : [];

    const contexto: ContextoGeneracionPreguntas = {
      eventoNombre: evento?.nombre ?? null,
      sesionTitulo: sesion.titulo,
      sesionTema: sesion.tema,
      ponentes,
      objetivosUsuario,
    };

    const preguntasGeneradas = await this.generador.generar(contexto);
    if (!preguntasGeneradas || preguntasGeneradas.length === 0) {
      throw new ApiError(
        503,
        'servicio_ia_no_disponible',
        'No se pudieron generar preguntas en este momento',
      );
    }

    // Borrado selectivo: solo preguntas sugeridas de esta sesión (FR-006, SC-003)
    const anteriores = await this.repos.preguntas.findBy(
      (p) => p.sesion_id === sesionId && p.origen === 'sugerida',
    );
    for (const p of anteriores) {
      await this.repos.preguntas.delete(p.id);
    }

    const ahora = new Date().toISOString();
    for (const p of preguntasGeneradas) {
      await this.repos.preguntas.create({
        sesion_id: sesionId,
        texto: p.texto,
        tipo: p.tipo,
        origen: 'sugerida',
        creado_en: ahora,
      });
    }
    return this.repos.preguntas.findBy((p) => p.sesion_id === sesionId);
  }

  async agregarManual(
    eventoId: string,
    sesionId: string,
    texto: unknown,
  ): Promise<PreguntaPreparada> {
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
