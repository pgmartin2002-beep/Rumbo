import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '../models/validation.js';

/** Error de negocio con código estable y status HTTP asociado. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }
}

/**
 * Manejador de errores central. Formato de error único (contracts/api.md):
 *   { "error": "<código>", "mensaje": "<texto legible>" }
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({ error: error.codigo, mensaje: error.message });
    }
    if (error instanceof ValidationError) {
      return reply.status(400).send({ error: error.codigo, mensaje: error.message });
    }
    if ((error as { validation?: unknown }).validation) {
      return reply
        .status(400)
        .send({ error: 'peticion_invalida', mensaje: error.message });
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const codigo = (error as { code?: string }).code ?? 'peticion_invalida';
      return reply.status(status).send({ error: codigo, mensaje: error.message });
    }
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: 'error_interno', mensaje: 'Ha ocurrido un error inesperado' });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: 'no_encontrado', mensaje: 'Recurso no encontrado' });
  });
}
