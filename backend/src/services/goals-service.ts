/**
 * Servicio de objetivos (Historia 2). Guarda/actualiza el perfil de objetivos de un evento
 * (selección múltiple, ≥1) y actualiza el progreso de onboarding. NO recalcula la agenda:
 * solo señala que hay un recálculo disponible (Principio IV, FR-009–FR-011).
 */
import type { Repositories } from '../repositories/index.js';
import type { Objetivo, PerfilObjetivos } from '../models/index.js';
import { validarObjetivos } from '../models/validation.js';
import { ApiError } from '../api/error-handler.js';

export interface GoalsResult {
  perfil: PerfilObjetivos;
  agenda_recalculo_disponible: boolean;
}

export class GoalsService {
  constructor(private readonly repos: Repositories) {}

  async definirObjetivos(eventoId: string, objetivos: Objetivo[]): Promise<GoalsResult> {
    validarObjetivos(objetivos);

    const evento = await this.repos.eventos.findById(eventoId);
    if (!evento) throw new ApiError(404, 'no_encontrado', 'Evento no encontrado');

    const ahora = new Date().toISOString();
    const perfil = await this.repos.perfilesObjetivos.upsertBy(
      (p) => p.evento_id === eventoId,
      { evento_id: eventoId, objetivos, actualizado_en: ahora },
    );

    // El progreso avanza a 'objetivos_definidos' salvo que ya se hubiera generado la agenda.
    if (evento.progreso_onboarding === 'importado') {
      await this.repos.eventos.update(eventoId, {
        progreso_onboarding: 'objetivos_definidos',
        actualizado_en: ahora,
      });
    }

    const agendaExistente = (await this.repos.agendas.findBy((a) => a.evento_id === eventoId))[0];
    return { perfil, agenda_recalculo_disponible: Boolean(agendaExistente) };
  }

  async obtenerObjetivos(eventoId: string): Promise<PerfilObjetivos | null> {
    return (await this.repos.perfilesObjetivos.findBy((p) => p.evento_id === eventoId))[0] ?? null;
  }
}
