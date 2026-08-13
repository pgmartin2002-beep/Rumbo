import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';
import type { CrearContactoInput, EditarContactoInput } from '../../services/contacts-service.js';

/** Contactos (Historia 4): GET, POST, PATCH, POST /fusionar. */
export function registerEventsContacts(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string } }>('/api/events/:id/contactos', async (request) => {
    return ctx.contactsService.listar(request.params.id);
  });

  app.post<{ Params: { id: string }; Body: CrearContactoInput }>(
    '/api/events/:id/contactos',
    async (request, reply) => {
      const resultado = await ctx.contactsService.crear(request.params.id, request.body);
      reply.status(201);
      return resultado;
    },
  );

  app.patch<{ Params: { id: string; contactoId: string }; Body: EditarContactoInput }>(
    '/api/events/:id/contactos/:contactoId',
    async (request) => {
      return ctx.contactsService.editar(request.params.id, request.params.contactoId, request.body);
    },
  );

  app.post<{ Params: { id: string; contactoId: string }; Body: { con_id: string } }>(
    '/api/events/:id/contactos/:contactoId/fusionar',
    async (request) => {
      return ctx.contactsService.fusionar(request.params.id, request.params.contactoId, request.body.con_id);
    },
  );
}
