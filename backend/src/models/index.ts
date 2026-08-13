/**
 * Tipos de dominio de la feature 001 (Onboarding y Agenda personalizada).
 * Derivados de specs/001-onboarding-agenda-personalizada/data-model.md.
 *
 * Nota de persistencia (MVP): estas entidades se guardan en ficheros JSON tras una capa de
 * repositorio. Las "FK" son referencias por `id` entre colecciones; la integridad la garantiza
 * el repositorio, no un motor SQL.
 */

export type ISODateTime = string;
export type UUID = string;

// --- Enums de dominio ---

export type FuenteImportacion =
  | 'url'
  | 'pdf'
  | 'imagen'
  | 'calendario'
  | 'correo'
  | 'qr'
  | 'buscador';

export type ProgresoOnboarding = 'importado' | 'objetivos_definidos' | 'agenda_generada';

/** Estado derivado (no persistido) calculado a partir de las fechas del evento. */
export type EstadoEvento = 'en_curso' | 'proximo' | 'cerrado';

export type Objetivo =
  | 'aprender'
  | 'clientes'
  | 'empleo'
  | 'inversores'
  | 'networking'
  | 'presentar'
  | 'colaboradores'
  | 'disfrutar';

export type PrioridadAgenda = 'imprescindible' | 'opcional' | 'descartable';

export type RolEmpresa = 'ponente' | 'patrocinador' | 'expositor';

export type MedioTransporte = 'publico' | 'coche' | 'a_pie';

export type EstadoRuta = 'propuesta' | 'confirmada';

export type TipoAlerta = 'trafico' | 'retraso' | 'cambio_ubicacion';

// --- Entidades ---

export interface Evento {
  id: UUID;
  nombre: string;
  fecha_inicio: ISODateTime;
  fecha_fin: ISODateTime;
  ubicacion: string | null;
  requisitos_acceso: string | null;
  fuente_importacion: FuenteImportacion;
  /** URL de origen cuando se importó por el camino real de extracción con IA (feature 003); `null` en el resto de casos. */
  fuente_valor: string | null;
  progreso_onboarding: ProgresoOnboarding;
  creado_en: ISODateTime;
  actualizado_en: ISODateTime;
}

export interface Sesion {
  id: UUID;
  evento_id: UUID;
  titulo: string;
  inicio: ISODateTime;
  fin: ISODateTime;
  sala: string | null;
  tema: string | null;
  ponente_ids: UUID[];
}

export interface Ponente {
  id: UUID;
  nombre: string;
  empresa: string | null;
}

export interface EmpresaParticipante {
  id: UUID;
  evento_id: UUID;
  nombre: string;
  rol: RolEmpresa | null;
}

export interface PerfilObjetivos {
  id: UUID;
  evento_id: UUID;
  objetivos: Objetivo[];
  actualizado_en: ISODateTime;
}

export interface AgendaItem {
  sesion_id: UUID;
  prioridad: PrioridadAgenda;
  motivo_recomendacion: string;
  en_conflicto: boolean;
  es_alternativa_de: UUID | null;
}

export interface AgendaPersonalizada {
  id: UUID;
  evento_id: UUID;
  items: AgendaItem[];
  generada_en: ISODateTime;
}

export interface Ruta {
  id: UUID;
  evento_id: UUID;
  origen: string;
  destino: string;
  medio_transporte: MedioTransporte;
  hora_salida_recomendada: ISODateTime;
  duracion_estimada: number;
  estado: EstadoRuta;
}

export interface AlertaLogistica {
  id: UUID;
  evento_id: UUID;
  tipo: TipoAlerta;
  sesion_id: UUID | null;
  generada_en: ISODateTime;
  propuesta_hora_salida: ISODateTime | null;
}

// --- Entidades de la feature 002 (preparar interacciones y vivir el evento) ---

export type OrigenPregunta = 'sugerida' | 'manual';

export interface PreguntaPreparada {
  id: UUID;
  sesion_id: UUID;
  texto: string;
  origen: OrigenPregunta;
  creado_en: ISODateTime;
}

export type OrigenNota = 'texto' | 'voz';
export type EstadoTranscripcion = 'pendiente' | 'completada';

export interface Nota {
  id: UUID;
  evento_id: UUID;
  sesion_id: UUID | null;
  contenido: string;
  origen: OrigenNota;
  estado_transcripcion: EstadoTranscripcion | null;
  creado_en: ISODateTime;
  actualizado_en: ISODateTime;
}

export interface Contacto {
  id: UUID;
  evento_id: UUID;
  sesion_id: UUID | null;
  nombre: string;
  nota: string | null;
  creado_en: ISODateTime;
  actualizado_en: ISODateTime;
}
