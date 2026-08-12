import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';

/**
 * Recálculo de agenda con confirmación explícita (FR-015, Principio IV).
 * GET  /api/events/:id/agenda/recalculo — devuelve la propuesta (diff) SIN aplicarla.
 * POST /api/events/:id/agenda/aplicar    — aplica solo tras confirmación del usuario.
 */
export function registerEventsAgendaRecalc(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string } }>(
    '/api/events/:id/agenda/recalculo',
    async (request) => {
      return ctx.agendaService.proponerRecalculo(request.params.id);
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/events/:id/agenda/aplicar',
    async (request) => {
      return ctx.agendaService.aplicarRecalculo(request.params.id);
    },
  );
}
