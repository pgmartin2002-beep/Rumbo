import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';

/** GET /api/events — lista de "Mis eventos" para la home (FR-023–FR-026, FR-029). */
export function registerEventsList(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/events', async () => {
    return ctx.eventsListService.listar();
  });
}
