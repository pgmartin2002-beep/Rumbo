import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';

/**
 * Alertas logísticas y confirmación de nueva hora de salida (FR-021, FR-022, Principio IV).
 * GET  /api/events/:id/alerts          — alertas activas con propuesta_hora_salida.
 * POST /api/events/:id/route/confirmar  — confirma la nueva salida (no cambia nada sin esto).
 */
export function registerEventsAlerts(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string } }>('/api/events/:id/alerts', async (request) => {
    return ctx.logisticsService.listarAlertas(request.params.id);
  });

  app.post<{ Params: { id: string }; Body: { alerta_id?: string } }>(
    '/api/events/:id/route/confirmar',
    async (request) => {
      const alertaId = request.body?.alerta_id ?? '';
      return ctx.logisticsService.confirmarNuevaSalida(request.params.id, alertaId);
    },
  );
}
