import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';

/** POST /api/events/:id/agenda — genera la agenda priorizada (FR-012–FR-014). */
export function registerEventsAgenda(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Params: { id: string } }>('/api/events/:id/agenda', async (request) => {
    return ctx.agendaService.generar(request.params.id);
  });

  app.get<{ Params: { id: string } }>('/api/events/:id/agenda', async (request, reply) => {
    const agenda = await ctx.agendaService.obtenerVista(request.params.id);
    if (!agenda) return reply.status(404).send({ error: 'no_encontrado', mensaje: 'Sin agenda' });
    return agenda;
  });
}
