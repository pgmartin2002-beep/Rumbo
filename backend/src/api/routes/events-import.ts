import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';
import { validarFuente } from '../../models/validation.js';

/** POST /api/events/import — crea un evento desde una fuente (FR-001–FR-007). */
export function registerEventsImport(app: FastifyInstance, ctx: AppContext): void {
  app.post<{ Body: { fuente?: string; payload?: string } }>(
    '/api/events/import',
    async (request, reply) => {
      const { fuente, payload } = request.body ?? {};
      validarFuente(fuente);
      const result = await ctx.importService.importar(fuente, payload ?? '');
      return reply.status(201).send({
        ...result.evento,
        campos_faltantes: result.campos_faltantes,
      });
    },
  );
}
