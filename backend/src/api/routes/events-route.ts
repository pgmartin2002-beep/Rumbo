import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';
import type { MedioTransporte } from '../../models/index.js';
import { validarMedioTransporte } from '../../models/validation.js';
import { ApiError } from '../error-handler.js';

/** POST /api/events/:id/route — calcula ruta y hora de salida (FR-016–FR-020). */
export function registerEventsRoute(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Params: { id: string }; Body: { origen?: string; medio?: MedioTransporte } }>(
    '/api/events/:id/route',
    async (request) => {
      const { origen, medio } = request.body ?? {};
      if (!origen || origen.trim() === '') {
        throw new ApiError(400, 'sin_origen', 'Indica un punto de origen para calcular la ruta');
      }
      validarMedioTransporte(medio);
      return ctx.logisticsService.calcularRuta(request.params.id, origen, medio);
    },
  );
}
