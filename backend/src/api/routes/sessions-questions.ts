import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';

/** Preguntas preparadas por sesión (Historia 1): GET, POST /generar, POST manual. */
export function registerSessionsQuestions(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string; sesionId: string } }>(
    '/api/events/:id/sesiones/:sesionId/preguntas',
    async (request) => {
      return ctx.questionsService.listar(request.params.id, request.params.sesionId);
    },
  );

  app.post<{ Params: { id: string; sesionId: string } }>(
    '/api/events/:id/sesiones/:sesionId/preguntas/generar',
    async (request) => {
      return ctx.questionsService.generar(request.params.id, request.params.sesionId);
    },
  );

  app.post<{ Params: { id: string; sesionId: string }; Body: { texto: string } }>(
    '/api/events/:id/sesiones/:sesionId/preguntas',
    async (request, reply) => {
      const pregunta = await ctx.questionsService.agregarManual(
        request.params.id,
        request.params.sesionId,
        request.body?.texto,
      );
      reply.status(201);
      return pregunta;
    },
  );
}
