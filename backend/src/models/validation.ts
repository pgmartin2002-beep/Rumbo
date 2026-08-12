/**
 * Validación de entidades de dominio y catálogos de valores permitidos.
 * Ligera y sin dependencias externas para el MVP (data-model.md · reglas de validación).
 */
import type {
  FuenteImportacion,
  MedioTransporte,
  Objetivo,
  RolEmpresa,
  TipoAlerta,
} from './index.js';

export const FUENTES_IMPORTACION: readonly FuenteImportacion[] = [
  'url',
  'pdf',
  'imagen',
  'calendario',
  'correo',
  'qr',
  'buscador',
];

export const OBJETIVOS_DISPONIBLES: readonly Objetivo[] = [
  'aprender',
  'clientes',
  'empleo',
  'inversores',
  'networking',
  'presentar',
  'colaboradores',
  'disfrutar',
];

export const MEDIOS_TRANSPORTE: readonly MedioTransporte[] = ['publico', 'coche', 'a_pie'];

export const ROLES_EMPRESA: readonly RolEmpresa[] = ['ponente', 'patrocinador', 'expositor'];

export const TIPOS_ALERTA: readonly TipoAlerta[] = ['trafico', 'retraso', 'cambio_ubicacion'];

export class ValidationError extends Error {
  constructor(
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ValidationError';
  }
}

export function assert(condition: unknown, codigo: string, mensaje: string): asserts condition {
  if (!condition) {
    throw new ValidationError(codigo, mensaje);
  }
}

/** Un perfil de objetivos requiere al menos un objetivo válido (FR-009, FR-010). */
export function validarObjetivos(objetivos: unknown): asserts objetivos is Objetivo[] {
  assert(Array.isArray(objetivos), 'objetivos_invalidos', 'objetivos debe ser una lista');
  assert(
    objetivos.length >= 1,
    'objetivos_vacios',
    'Debes seleccionar al menos un objetivo para el evento',
  );
  for (const o of objetivos) {
    assert(
      OBJETIVOS_DISPONIBLES.includes(o as Objetivo),
      'objetivo_desconocido',
      `Objetivo no reconocido: ${String(o)}`,
    );
  }
}

export function validarFuente(fuente: unknown): asserts fuente is FuenteImportacion {
  assert(
    typeof fuente === 'string' && FUENTES_IMPORTACION.includes(fuente as FuenteImportacion),
    'fuente_invalida',
    `Fuente de importación no soportada: ${String(fuente)}`,
  );
}

export function validarMedioTransporte(medio: unknown): asserts medio is MedioTransporte {
  assert(
    typeof medio === 'string' && MEDIOS_TRANSPORTE.includes(medio as MedioTransporte),
    'medio_invalido',
    `Medio de transporte no soportado: ${String(medio)}`,
  );
}
