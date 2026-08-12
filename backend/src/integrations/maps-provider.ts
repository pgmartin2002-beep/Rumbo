/**
 * Adaptador de mapas / tráfico / transporte (proveedor externo). Solo lo llama el backend
 * (Principio VI). Stub para el MVP: el proveedor real (p. ej. Google Maps, atribuido en el
 * diseño) y la fuente de tráfico en tiempo real se deciden en la spec de backend.
 */
import type { MedioTransporte } from '../models/index.js';

export interface OpcionTransporte {
  medio: MedioTransporte;
  duracion_min: number;
  descripcion: string;
}

export interface Aparcamiento {
  nombre: string;
  distancia_min: number;
}

export interface RutaCalculada {
  duracion_min: number;
  opciones: OpcionTransporte[];
  parking: Aparcamiento[];
}

export interface MapsProviderAdapter {
  /** Calcula la ruta origen→destino para un medio de transporte. */
  calcularRuta(origen: string, destino: string, medio: MedioTransporte): Promise<RutaCalculada>;
  /** Tiempo estimado de desplazamiento entre dos salas/sedes (FR-020). */
  tiempoEntreSalas(salaOrigen: string, salaDestino: string): Promise<number>;
}

/** Stub determinista: duraciones fijas por medio; suficiente para validar los flujos del MVP. */
export class StubMapsProviderAdapter implements MapsProviderAdapter {
  async calcularRuta(
    _origen: string,
    _destino: string,
    medio: MedioTransporte,
  ): Promise<RutaCalculada> {
    const base: Record<MedioTransporte, number> = { publico: 35, coche: 25, a_pie: 50 };
    const duracion = base[medio];
    return {
      duracion_min: duracion,
      opciones: [
        { medio: 'publico', duracion_min: base.publico, descripcion: 'Metro + bus' },
        { medio: 'coche', duracion_min: base.coche, descripcion: 'Ruta más rápida' },
        { medio: 'a_pie', duracion_min: base.a_pie, descripcion: 'Andando' },
      ],
      parking: medio === 'coche' ? [{ nombre: 'Parking Recinto', distancia_min: 4 }] : [],
    };
  }

  async tiempoEntreSalas(salaOrigen: string, salaDestino: string): Promise<number> {
    return salaOrigen === salaDestino ? 0 : 8;
  }
}
