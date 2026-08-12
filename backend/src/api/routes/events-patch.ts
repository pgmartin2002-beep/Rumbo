import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';
import type { Evento } from '../../models/index.js';

/** PATCH /api/events/:id — completa o corrige datos del evento (FR-008). */
export function registerEventsPatch(app: FastifyInstance, ctx: AppContext): void {
  app.patch<{ Params: { id: string }; Body: Partial<Evento> }>(
    '/api/events/:id',
    async (request) => {
      const { id, creado_en, ...patch } = request.body as Partial<Evento>;
      void id;
      void creado_en;
      return ctx.importService.actualizarEvento(request.params.id, patch);
    },
  );
}
