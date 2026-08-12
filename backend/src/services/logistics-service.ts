/**
 * Servicio de logística (Historia 4). Calcula ruta y hora de salida recomendada usando el
 * adaptador de mapas, ofrece transporte y aparcamiento, avisa de huecos insuficientes entre
 * salas (FR-016–FR-020) y genera alertas + propuesta de nueva hora de salida SIN aplicarla
 * hasta la confirmación explícita (FR-021, FR-022, Principio IV).
 */
import type { MapsProviderAdapter } from '../integrations/maps-provider.js';
import type { Repositories } from '../repositories/index.js';
import type { AlertaLogistica, MedioTransporte, Ruta, Sesion } from '../models/index.js';
import { ApiError } from '../api/error-handler.js';

export interface RouteResult {
  ruta: Ruta;
  opciones_transporte: { medio: MedioTransporte; duracion_min: number; descripcion: string }[];
  parking: { nombre: string; distancia_min: number }[];
  avisos_desplazamiento: string[];
}

export class LogisticsService {
  constructor(
    private readonly repos: Repositories,
    private readonly maps: MapsProviderAdapter,
  ) {}

  private async primeraSesion(eventoId: string): Promise<Sesion | null> {
    const sesiones = await this.repos.sesiones.findBy((s) => s.evento_id === eventoId);
    return (
      sesiones.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0] ?? null
    );
  }

  private async avisosEntreSalas(eventoId: string): Promise<string[]> {
    const sesiones = (await this.repos.sesiones.findBy((s) => s.evento_id === eventoId)).sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    );
    const avisos: string[] = [];
    for (let i = 0; i < sesiones.length - 1; i++) {
      const actual = sesiones[i];
      const siguiente = sesiones[i + 1];
      if (!actual.sala || !siguiente.sala) continue;
      const huecoMin = (new Date(siguiente.inicio).getTime() - new Date(actual.fin).getTime()) / 60000;
      if (huecoMin < 0) continue;
      const necesario = await this.maps.tiempoEntreSalas(actual.sala, siguiente.sala);
      if (necesario > huecoMin) {
        avisos.push(
          `Hueco insuficiente entre "${actual.titulo}" y "${siguiente.titulo}": necesitas ${necesario} min y solo tienes ${Math.round(huecoMin)} min.`,
        );
      }
    }
    return avisos;
  }

  async calcularRuta(
    eventoId: string,
    origen: string,
    medio: MedioTransporte,
  ): Promise<RouteResult> {
    const evento = await this.repos.eventos.findById(eventoId);
    if (!evento) throw new ApiError(404, 'no_encontrado', 'Evento no encontrado');
    const destino = evento.ubicacion ?? 'Recinto del evento';

    const calc = await this.maps.calcularRuta(origen, destino, medio);
    const primera = await this.primeraSesion(eventoId);
    const inicioRef = primera ? new Date(primera.inicio) : new Date(evento.fecha_inicio);
    const horaSalida = new Date(inicioRef.getTime() - calc.duracion_min * 60000).toISOString();

    const ruta = await this.repos.rutas.upsertBy(
      (r) => r.evento_id === eventoId && r.estado === 'confirmada',
      {
        evento_id: eventoId,
        origen,
        destino,
        medio_transporte: medio,
        hora_salida_recomendada: horaSalida,
        duracion_estimada: calc.duracion_min,
        estado: 'confirmada',
      },
    );

    return {
      ruta,
      opciones_transporte: calc.opciones,
      parking: calc.parking,
      avisos_desplazamiento: await this.avisosEntreSalas(eventoId),
    };
  }

  async listarAlertas(eventoId: string): Promise<AlertaLogistica[]> {
    return this.repos.alertas.findBy((a) => a.evento_id === eventoId);
  }

  /**
   * Confirma la nueva hora de salida propuesta por una alerta (FR-022, Principio IV).
   * Sin esta llamada la ruta NO cambia (no hay actualización automática silenciosa).
   */
  async confirmarNuevaSalida(eventoId: string, alertaId: string): Promise<Ruta> {
    const alerta = await this.repos.alertas.findById(alertaId);
    if (!alerta || alerta.evento_id !== eventoId) {
      throw new ApiError(404, 'no_encontrado', 'Alerta no encontrada');
    }
    if (!alerta.propuesta_hora_salida) {
      throw new ApiError(409, 'sin_propuesta', 'La alerta no tiene una nueva hora de salida propuesta');
    }
    const ruta = (await this.repos.rutas.findBy((r) => r.evento_id === eventoId))[0];
    if (!ruta) throw new ApiError(409, 'sin_ruta', 'No hay una ruta calculada para este evento');

    const actualizada = await this.repos.rutas.update(ruta.id, {
      hora_salida_recomendada: alerta.propuesta_hora_salida,
      estado: 'confirmada',
    });
    return actualizada!;
  }
}
