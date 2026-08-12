/**
 * Adaptador de extracción de eventos (motor externo). El cliente NUNCA lo llama directamente;
 * solo el backend (Principio VI). Implementación stub/mock para el MVP: la fuente real
 * (OCR/scraping/parseo de calendario) se decide en la spec de backend/integración.
 */
import type { FuenteImportacion } from '../models/index.js';

export interface DatosEventoExtraidos {
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  ubicacion: string | null;
  requisitos_acceso: string | null;
  sesiones: {
    titulo: string;
    inicio: string;
    fin: string;
    sala: string | null;
    tema: string | null;
    ponentes: { nombre: string; empresa: string | null }[];
  }[];
  empresas: { nombre: string; rol: string | null }[];
}

export interface EventExtractionAdapter {
  /** Extrae datos estructurados de una fuente. Devuelve null si es ilegible (FR-007, 422). */
  extraer(fuente: FuenteImportacion, payload: string): Promise<DatosEventoExtraidos | null>;
}

/**
 * Stub determinista para el MVP: interpreta `payload` como JSON con datos ya estructurados
 * (útil para pruebas y demos). Si el payload es la cadena "illegible" o no parsea, simula
 * una fuente ilegible devolviendo null.
 */
export class StubEventExtractionAdapter implements EventExtractionAdapter {
  async extraer(_fuente: FuenteImportacion, payload: string): Promise<DatosEventoExtraidos | null> {
    if (!payload || payload.trim().toLowerCase() === 'illegible') return null;
    try {
      const parsed = JSON.parse(payload) as Partial<DatosEventoExtraidos>;
      return {
        nombre: parsed.nombre ?? null,
        fecha_inicio: parsed.fecha_inicio ?? null,
        fecha_fin: parsed.fecha_fin ?? null,
        ubicacion: parsed.ubicacion ?? null,
        requisitos_acceso: parsed.requisitos_acceso ?? null,
        sesiones: parsed.sesiones ?? [],
        empresas: parsed.empresas ?? [],
      };
    } catch {
      return null;
    }
  }
}
