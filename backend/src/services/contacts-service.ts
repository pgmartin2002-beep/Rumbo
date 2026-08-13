/**
 * Servicio de contactos registrados durante el evento (Historia 4, FR-011–FR-012, FR-015–FR-016).
 */
import type { Repositories } from '../repositories/index.js';
import type { Contacto } from '../models/index.js';
import { ApiError } from '../api/error-handler.js';
import { validarNombreContacto } from '../models/validation.js';
import { esPosibleDuplicado } from './name-matching.js';

export interface CrearContactoInput {
  sesion_id: string | null;
  nombre: string;
  nota?: string | null;
}

export interface EditarContactoInput {
  nombre?: string;
  nota?: string | null;
}

export interface ContactoConDuplicados {
  contacto: Contacto;
  posibles_duplicados: { id: string; nombre: string }[];
}

export class ContactsService {
  constructor(private readonly repos: Repositories) {}

  private async validarSesion(eventoId: string, sesionId: string | null): Promise<void> {
    if (sesionId === null) return;
    const sesion = await this.repos.sesiones.findById(sesionId);
    if (!sesion || sesion.evento_id !== eventoId) {
      throw new ApiError(404, 'sesion_no_encontrada', 'La sesión no existe en este evento');
    }
  }

  private async obtenerContacto(eventoId: string, contactoId: string): Promise<Contacto> {
    const contacto = await this.repos.contactos.findById(contactoId);
    if (!contacto || contacto.evento_id !== eventoId) {
      throw new ApiError(404, 'contacto_no_encontrado', 'El contacto no existe en este evento');
    }
    return contacto;
  }

  async listar(eventoId: string): Promise<Contacto[]> {
    return this.repos.contactos.findBy((c) => c.evento_id === eventoId);
  }

  /** El nombre coincidente, exacto o aproximado, nunca bloquea el guardado (FR-016). */
  async crear(eventoId: string, input: CrearContactoInput): Promise<ContactoConDuplicados> {
    validarNombreContacto(input.nombre);
    const sesionId = input.sesion_id ?? null;
    await this.validarSesion(eventoId, sesionId);

    const ahora = new Date().toISOString();
    const contacto = await this.repos.contactos.create({
      evento_id: eventoId,
      sesion_id: sesionId,
      nombre: input.nombre.trim(),
      nota: input.nota?.trim() || null,
      creado_en: ahora,
      actualizado_en: ahora,
    });

    const existentes = await this.repos.contactos.findBy(
      (c) => c.evento_id === eventoId && c.id !== contacto.id,
    );
    const posibles_duplicados = existentes
      .filter((c) => esPosibleDuplicado(c.nombre, contacto.nombre))
      .map((c) => ({ id: c.id, nombre: c.nombre }));

    return { contacto, posibles_duplicados };
  }

  async editar(eventoId: string, contactoId: string, patch: EditarContactoInput): Promise<Contacto> {
    await this.obtenerContacto(eventoId, contactoId);
    const cambios: Partial<Omit<Contacto, 'id'>> = { actualizado_en: new Date().toISOString() };
    if (patch.nombre !== undefined) {
      validarNombreContacto(patch.nombre);
      cambios.nombre = patch.nombre.trim();
    }
    if (patch.nota !== undefined) {
      cambios.nota = patch.nota?.trim() || null;
    }
    const actualizado = await this.repos.contactos.update(contactoId, cambios);
    return actualizado!;
  }

  /** Fusiona `origenId` (se elimina) en `destinoId` (se conserva), combinando notas no vacías. */
  async fusionar(eventoId: string, destinoId: string, origenId: string): Promise<Contacto> {
    const destino = await this.obtenerContacto(eventoId, destinoId);
    const origen = await this.obtenerContacto(eventoId, origenId);

    const notas = [destino.nota, origen.nota].filter((n): n is string => Boolean(n && n.trim()));
    const notaFusionada = notas.length > 0 ? notas.join('\n') : null;

    const actualizado = await this.repos.contactos.update(destinoId, {
      nota: notaFusionada,
      actualizado_en: new Date().toISOString(),
    });
    await this.repos.contactos.delete(origenId);
    return actualizado!;
  }
}
