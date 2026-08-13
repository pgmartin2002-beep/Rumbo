/**
 * Servicio de notas de texto/voz vinculadas a la sesión activa o al evento en general
 * (Historia 3, FR-008–FR-010, FR-013).
 */
import type { Repositories } from '../repositories/index.js';
import type { Nota } from '../models/index.js';
import { ApiError } from '../api/error-handler.js';
import { validarContenidoNota } from '../models/validation.js';
import type { VoiceTranscriptionAdapter } from '../integrations/voice-transcription.js';

export interface CrearNotaInput {
  sesion_id: string | null;
  origen: 'texto' | 'voz';
  contenido?: string;
  audio?: string;
}

export interface EditarNotaInput {
  contenido?: string;
  sesion_id?: string | null;
}

export class NotesService {
  constructor(
    private readonly repos: Repositories,
    private readonly transcriptor: VoiceTranscriptionAdapter,
  ) {}

  private async validarSesion(eventoId: string, sesionId: string | null): Promise<void> {
    if (sesionId === null) return;
    const sesion = await this.repos.sesiones.findById(sesionId);
    if (!sesion || sesion.evento_id !== eventoId) {
      throw new ApiError(404, 'sesion_no_encontrada', 'La sesión no existe en este evento');
    }
  }

  private async obtenerNota(eventoId: string, notaId: string): Promise<Nota> {
    const nota = await this.repos.notas.findById(notaId);
    if (!nota || nota.evento_id !== eventoId) {
      throw new ApiError(404, 'nota_no_encontrada', 'La nota no existe en este evento');
    }
    return nota;
  }

  async listar(eventoId: string): Promise<Nota[]> {
    const notas = await this.repos.notas.findBy((n) => n.evento_id === eventoId);
    return [...notas].sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  }

  /**
   * Si `origen: 'voz'` y la transcripción no resulta fiable, la nota se guarda igualmente con
   * `contenido: ''` y `estado_transcripcion: 'pendiente'` para que el usuario la complete a mano
   * (caso límite de spec.md, resuelto en contracts/api.md).
   */
  async crear(eventoId: string, input: CrearNotaInput): Promise<Nota> {
    const sesionId = input.sesion_id ?? null;
    await this.validarSesion(eventoId, sesionId);
    const ahora = new Date().toISOString();

    if (input.origen === 'voz') {
      const texto = await this.transcriptor.transcribir(input.audio ?? '');
      return this.repos.notas.create({
        evento_id: eventoId,
        sesion_id: sesionId,
        contenido: texto ?? '',
        origen: 'voz',
        estado_transcripcion: texto === null ? 'pendiente' : 'completada',
        creado_en: ahora,
        actualizado_en: ahora,
      });
    }

    validarContenidoNota(input.contenido);
    return this.repos.notas.create({
      evento_id: eventoId,
      sesion_id: sesionId,
      contenido: input.contenido.trim(),
      origen: 'texto',
      estado_transcripcion: null,
      creado_en: ahora,
      actualizado_en: ahora,
    });
  }

  /** Permite editar el contenido y/o reasignar la sesión (aclaración de sesión 2026-08-12). */
  async editar(eventoId: string, notaId: string, patch: EditarNotaInput): Promise<Nota> {
    const nota = await this.obtenerNota(eventoId, notaId);
    const cambios: Partial<Omit<Nota, 'id'>> = { actualizado_en: new Date().toISOString() };

    if (patch.sesion_id !== undefined) {
      await this.validarSesion(eventoId, patch.sesion_id);
      cambios.sesion_id = patch.sesion_id;
    }
    if (patch.contenido !== undefined) {
      validarContenidoNota(patch.contenido);
      cambios.contenido = patch.contenido.trim();
      if (nota.origen === 'voz') cambios.estado_transcripcion = 'completada';
    }

    const actualizada = await this.repos.notas.update(notaId, cambios);
    return actualizada!;
  }

  async eliminar(eventoId: string, notaId: string): Promise<void> {
    await this.obtenerNota(eventoId, notaId);
    await this.repos.notas.delete(notaId);
  }
}
