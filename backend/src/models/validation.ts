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

/** Una pregunta manual requiere texto no vacío (FR-003). */
export function validarTextoPregunta(texto: unknown): asserts texto is string {
  assert(
    typeof texto === 'string' && texto.trim().length > 0,
    'pregunta_invalida',
    'El texto de la pregunta no puede estar vacío',
  );
}

/** Una nota de texto (o una transcripción ya completada) requiere contenido no vacío (FR-008). */
export function validarContenidoNota(contenido: unknown): asserts contenido is string {
  assert(
    typeof contenido === 'string' && contenido.trim().length > 0,
    'contenido_vacio',
    'El contenido de la nota no puede estar vacío',
  );
}

/** Un contacto solo exige nombre; la nota rápida es opcional (FR-011, aclaración 2026-08-12). */
export function validarNombreContacto(nombre: unknown): asserts nombre is string {
  assert(
    typeof nombre === 'string' && nombre.trim().length > 0,
    'nombre_requerido',
    'El nombre del contacto es obligatorio',
  );
}

// --- Validación de preguntas generadas por IA (FR-004, FR-008) ---

export interface PreguntaGeneradaValidacion {
  texto: string;
  tipo: TipoPregunta;
}

export interface RespuestaGeneracionToolValidacion {
  preguntas: PreguntaGeneradaValidacion[];
}

function esPreguntaGeneradaValida(p: unknown): p is PreguntaGeneradaValidacion {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Record<string, unknown>;
  if (typeof obj.texto !== 'string' || obj.texto.trim().length === 0) return false;
  if (obj.tipo !== 'general' && obj.tipo !== 'tecnica') return false;
  return true;
}

/**
 * Valida la estructura devuelta por el motor de IA para preguntas (FR-004, FR-008):
 * exactamente 4 preguntas, textos no vacíos, tipos válidos ('general' o 'tecnica') y
 * al menos una pregunta de cada categoría.
 */
export function esPreguntasGeneradasValidas(datos: unknown): datos is RespuestaGeneracionToolValidacion {
  if (!datos || typeof datos !== 'object') return false;
  const obj = datos as Record<string, unknown>;
  if (!Array.isArray(obj.preguntas) || obj.preguntas.length !== 4) return false;
  if (!obj.preguntas.every(esPreguntaGeneradaValida)) return false;
  const tieneGeneral = obj.preguntas.some((p) => p.tipo === 'general');
  const tieneTecnica = obj.preguntas.some((p) => p.tipo === 'tecnica');
  return tieneGeneral && tieneTecnica;
}
