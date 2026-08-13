import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';
import type { CrearNotaInput, EditarNotaInput } from '../../services/notes-service.js';

/** Notas de texto/voz (Historia 3): GET, POST, PATCH, DELETE. */
export function registerEventsNotes(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string } }>('/api/events/:id/notas', async (request) => {
    return ctx.notesService.listar(request.params.id);
  });

  app.post<{ Params: { id: string }; Body: CrearNotaInput }>(
    '/api/events/:id/notas',
    async (request, reply) => {
      const nota = await ctx.notesService.crear(request.params.id, request.body);
      reply.status(201);
      return nota;
    },
  );

  app.patch<{ Params: { id: string; notaId: string }; Body: EditarNotaInput }>(
    '/api/events/:id/notas/:notaId',
    async (request) => {
      return ctx.notesService.editar(request.params.id, request.params.notaId, request.body);
    },
  );

  app.delete<{ Params: { id: string; notaId: string } }>(
    '/api/events/:id/notas/:notaId',
    async (request, reply) => {
      await ctx.notesService.eliminar(request.params.id, request.params.notaId);
      reply.status(204);
      return null;
    },
  );
}
