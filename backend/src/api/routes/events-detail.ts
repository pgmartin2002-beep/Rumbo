import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';

/** GET /api/events/:id — detalle del evento con punto de retorno (FR-028). */
export function registerEventsDetail(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string } }>('/api/events/:id', async (request) => {
    return ctx.eventsListService.detalle(request.params.id);
  });
}
