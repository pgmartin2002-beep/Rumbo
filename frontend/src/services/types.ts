/** DTOs que devuelve el BFF (espejo del contrato contracts/api.md). */
export type EstadoEvento = 'en_curso' | 'proximo' | 'cerrado';
export type ProgresoOnboarding = 'importado' | 'objetivos_definidos' | 'agenda_generada';
export type PrioridadAgenda = 'imprescindible' | 'opcional' | 'descartable';
export type MedioTransporte = 'publico' | 'coche' | 'a_pie';

export type Objetivo =
  | 'aprender'
  | 'clientes'
  | 'empleo'
  | 'inversores'
  | 'networking'
  | 'presentar'
  | 'colaboradores'
  | 'disfrutar';

export interface EventoListado {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion: string | null;
  progreso_onboarding: ProgresoOnboarding;
  estado_derivado: EstadoEvento;
  pasos_completados: string[];
  pasos_pendientes: string[];
  proxima_actividad_inicio: string | null;
}

export interface EventDetail extends EventoListado {
  punto_retorno: 'objetivos' | 'agenda' | 'en_curso';
}

export interface EventDraft extends EventoListado {
  campos_faltantes: string[];
}

export interface GoalProfile {
  id: string;
  evento_id: string;
  objetivos: Objetivo[];
  actualizado_en: string;
  agenda_recalculo_disponible?: boolean;
}

export interface AgendaItem {
  sesion_id: string;
  prioridad: PrioridadAgenda;
  motivo_recomendacion: string;
  en_conflicto: boolean;
  es_alternativa_de: string | null;
}

export interface Agenda {
  id: string;
  evento_id: string;
  items: AgendaItem[];
  generada_en: string;
}

export interface AgendaDiff {
  suben: string[];
  bajan: string[];
  entran: string[];
  salen: string[];
}

export interface Route {
  id: string;
  evento_id: string;
  origen: string;
  destino: string;
  medio_transporte: MedioTransporte;
  hora_salida_recomendada: string;
  duracion_estimada: number;
  estado: 'propuesta' | 'confirmada';
}

export interface RouteResult {
  ruta: Route;
  opciones_transporte: { medio: MedioTransporte; duracion_min: number; descripcion: string }[];
  parking: { nombre: string; distancia_min: number }[];
  avisos_desplazamiento: string[];
}

export interface Alert {
  id: string;
  evento_id: string;
  tipo: 'trafico' | 'retraso' | 'cambio_ubicacion';
  sesion_id: string | null;
  generada_en: string;
  propuesta_hora_salida: string | null;
}

export const OBJETIVOS: { id: Objetivo; label: string }[] = [
  { id: 'aprender', label: 'Aprender sobre un tema' },
  { id: 'clientes', label: 'Encontrar clientes' },
  { id: 'empleo', label: 'Buscar empleo' },
  { id: 'inversores', label: 'Conocer inversores' },
  { id: 'networking', label: 'Hacer networking' },
  { id: 'presentar', label: 'Presentar un proyecto' },
  { id: 'colaboradores', label: 'Encontrar colaboradores' },
  { id: 'disfrutar', label: 'Disfrutar sin perderme lo importante' },
];
