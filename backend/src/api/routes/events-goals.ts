import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';
import type { Objetivo } from '../../models/index.js';

/** PUT /api/events/:id/goals — define/actualiza objetivos (FR-009–FR-011, Principio IV). */
export function registerEventsGoals(app: FastifyInstance, ctx: AppContext): void {
  app.put<{ Params: { id: string }; Body: { objetivos?: Objetivo[] } }>(
    '/api/events/:id/goals',
    async (request) => {
      const objetivos = request.body?.objetivos ?? [];
      const result = await ctx.goalsService.definirObjetivos(request.params.id, objetivos);
      return {
        ...result.perfil,
        agenda_recalculo_disponible: result.agenda_recalculo_disponible,
      };
    },
  );
}
