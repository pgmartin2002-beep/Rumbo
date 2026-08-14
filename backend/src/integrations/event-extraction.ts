/**
 * Adaptador de extracción de eventos (motor externo). El cliente NUNCA lo llama directamente;
 * solo el backend (Principio VI).
 *
 * `StubEventExtractionAdapter` interpreta el payload como JSON estructurado (demos, pruebas,
 * feature 001). `AnthropicEventExtractionAdapter` usa IA para estructurar el evento a partir de
 * texto ya obtenido de una URL. `CompositeEventExtractionAdapter` es el único que consume
 * `ImportService`: decide entre ambos caminos a partir de la forma del `payload`, sin necesidad
 * de un campo nuevo en el contrato de importación (research.md R8).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { FuenteImportacion } from '../models/index.js';
import { obtenerHtml } from './http-fetch.js';
import { htmlATexto } from '../services/html-to-text.js';
import { PRESUPUESTO_TOTAL_MS, LIGERA_MS, RENDER_MS, IA_RENDER_MS } from './render-config.js';
import type { RenderizadorNavegador, EstadoRender } from './browser-renderer.js';

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

// --- Validación de la estructura devuelta por la IA (FR-004, research.md R6) ---

function esFechaIsoValida(fecha: unknown): fecha is string {
  return typeof fecha === 'string' && fecha.trim() !== '' && !Number.isNaN(Date.parse(fecha));
}

function esCadenaONulo(valor: unknown): valor is string | null {
  return valor === null || typeof valor === 'string';
}

function esPonenteValido(ponente: unknown): boolean {
  if (!ponente || typeof ponente !== 'object') return false;
  const p = ponente as Record<string, unknown>;
  return typeof p.nombre === 'string' && p.nombre.trim() !== '' && esCadenaONulo(p.empresa ?? null);
}

function esSesionValida(sesion: unknown): boolean {
  if (!sesion || typeof sesion !== 'object') return false;
  const s = sesion as Record<string, unknown>;
  if (typeof s.titulo !== 'string' || s.titulo.trim() === '') return false;
  if (!esFechaIsoValida(s.inicio) || !esFechaIsoValida(s.fin)) return false;
  if (!esCadenaONulo(s.sala ?? null) || !esCadenaONulo(s.tema ?? null)) return false;
  if (!Array.isArray(s.ponentes) || !s.ponentes.every(esPonenteValido)) return false;
  return true;
}

function esEmpresaValida(empresa: unknown): boolean {
  if (!empresa || typeof empresa !== 'object') return false;
  const e = empresa as Record<string, unknown>;
  return typeof e.nombre === 'string' && e.nombre.trim() !== '' && esCadenaONulo(e.rol ?? null);
}

/**
 * Valida la estructura devuelta por el motor de IA antes de persistir (FR-004): tipos correctos,
 * fechas ISO 8601 parseables y coherentes, y al menos un dato útil (nombre o alguna sesión) para
 * descartar respuestas vacías o no fiables.
 */
export function esDatosExtraidosValidos(datos: unknown): datos is DatosEventoExtraidos {
  if (!datos || typeof datos !== 'object') return false;
  const d = datos as Record<string, unknown>;

  if (!esCadenaONulo(d.nombre ?? null)) return false;
  if (d.fecha_inicio !== null && !esFechaIsoValida(d.fecha_inicio)) return false;
  if (d.fecha_fin !== null && !esFechaIsoValida(d.fecha_fin)) return false;
  if (
    typeof d.fecha_inicio === 'string' &&
    typeof d.fecha_fin === 'string' &&
    Date.parse(d.fecha_fin as string) < Date.parse(d.fecha_inicio as string)
  ) {
    return false;
  }
  if (!esCadenaONulo(d.ubicacion ?? null) || !esCadenaONulo(d.requisitos_acceso ?? null)) return false;
  if (!Array.isArray(d.sesiones) || !d.sesiones.every(esSesionValida)) return false;
  if (d.empresas !== undefined && (!Array.isArray(d.empresas) || !d.empresas.every(esEmpresaValida))) {
    return false;
  }

  const sesiones = d.sesiones as unknown[];
  if (!d.nombre && sesiones.length === 0) return false; // nada útil extraído → no fiable/vacío

  return true;
}

// --- Motor de IA (FR-003, FR-009, FR-011, research.md R3) ---

/** Contrato del motor de IA que estructura texto ya obtenido; reemplazable sin tocar el resto del pipeline (FR-011). */
export interface MotorExtraccionIA {
  estructurar(texto: string, deadline: number): Promise<DatosEventoExtraidos | null>;
}

const REGISTRAR_EVENTO_TOOL = {
  name: 'registrar_evento',
  description:
    'Registra los datos estructurados de un evento (nombre, fechas, ubicación, sesiones y ponentes) extraídos del texto proporcionado.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nombre: { type: ['string', 'null'] },
      fecha_inicio: { type: ['string', 'null'], description: 'Fecha y hora ISO 8601, con año explícito' },
      fecha_fin: { type: ['string', 'null'], description: 'Fecha y hora ISO 8601, con año explícito' },
      ubicacion: { type: ['string', 'null'] },
      requisitos_acceso: { type: ['string', 'null'] },
      sesiones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string' },
            inicio: { type: 'string', description: 'ISO 8601, con año explícito' },
            fin: { type: 'string', description: 'ISO 8601, con año explícito' },
            sala: { type: ['string', 'null'] },
            tema: { type: ['string', 'null'] },
            ponentes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  empresa: { type: ['string', 'null'] },
                },
                required: ['nombre', 'empresa'],
              },
            },
          },
          required: ['titulo', 'inicio', 'fin', 'sala', 'tema', 'ponentes'],
        },
      },
      empresas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            rol: { type: ['string', 'null'] },
          },
          required: ['nombre', 'rol'],
        },
      },
    },
    required: ['nombre', 'fecha_inicio', 'fecha_fin', 'ubicacion', 'requisitos_acceso', 'sesiones', 'empresas'],
  },
};

const SYSTEM_PROMPT = [
  'Extraes datos estructurados de eventos (conferencias, meetups, ferias) a partir del texto de',
  'una página web. No inventes datos: si un campo no aparece claramente en el texto, usa null.',
  'Normaliza todas las fechas y horas a ISO 8601 con año explícito (nunca dejes un año ambiguo o',
  'implícito). Si una fecha es ambigua o no puedes determinar el año con certeza, usa null en ese',
  'campo en vez de adivinar. Devuelve el resultado únicamente llamando a la herramienta',
  'registrar_evento, sin texto adicional.',
].join(' ');

/** Motor real: Anthropic Claude con salida forzada por *tool use* (research.md R3, R5, R6). */
export class AnthropicEventExtractionAdapter implements MotorExtraccionIA {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly modelo: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async estructurar(texto: string, deadline: number): Promise<DatosEventoExtraidos | null> {
    const restante = deadline - Date.now();
    if (restante <= 0) return null;

    let respuesta: Anthropic.Messages.Message;
    try {
      respuesta = await this.client.messages.create(
        {
          model: this.modelo,
          max_tokens: 4096,
          temperature: 0,
          system: SYSTEM_PROMPT,
          tools: [REGISTRAR_EVENTO_TOOL],
          tool_choice: { type: 'tool', name: 'registrar_evento' },
          messages: [{ role: 'user', content: texto }],
        },
        { signal: AbortSignal.timeout(restante) },
      );
    } catch {
      return null;
    }

    const bloqueTool = respuesta.content.find(
      (bloque): bloque is Anthropic.Messages.ToolUseBlock => bloque.type === 'tool_use',
    );
    if (!bloqueTool) return null;

    return esDatosExtraidosValidos(bloqueTool.input) ? bloqueTool.input : null;
  }
}

// --- Enrutado entre importación estructurada y URL real (FR-001, FR-007, research.md R8) ---

/** Presupuesto total (fetch ligero + render + IA) por importación URL; se re-exporta (feature 004). */
export { PRESUPUESTO_TOTAL_MS };

/** ¿`payload` es una URL http/https candidata a extracción real? (research.md R8) */
export function esUrlPublicaCandidata(payload: string): boolean {
  const recortado = payload.trim();
  if (!recortado) return false;
  let url: URL;
  try {
    url = new URL(recortado);
  } catch {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function pareceJsonEstructurado(payload: string): boolean {
  return payload.trim().startsWith('{');
}

export interface LimitesExtraccionUrl {
  maxHtmlBytes: number;
  maxChars: number;
}

/** Sesiones extraídas por una vía (0 si el resultado es nulo). */
function contarSesiones(datos: DatosEventoExtraidos | null): number {
  return datos?.sesiones.length ?? 0;
}

/** Telemetría segura de una importación por URL (FR-012): sin HTML, texto, cookies ni credenciales. */
export interface TelemetriaExtraccion {
  url: string;
  ruta: 'ligera' | 'render';
  render_usado: boolean;
  estado_render?: EstadoRender;
  solicitudes_bloqueadas?: number;
  duracion_ms: number;
  resultado: 'exito' | 'parcial' | 'ilegible';
}

export type RegistrarTelemetria = (t: TelemetriaExtraccion) => void;

interface ResultadoRenderIA {
  datos: DatosEventoExtraidos | null;
  estado: EstadoRender;
  bloqueadas: number;
}

/**
 * Único adaptador que consume `ImportService`. Decide el camino por la forma del `payload`: JSON
 * estructurado → sin IA (FR-007); URL http/https → vía ligera (003) y, si no extrae ninguna sesión,
 * escalado al render (feature 004). El render solo entra en juego si hay renderizador; su fallback
 * conserva un resultado ligero útil o degrada a ilegible (FR-011). Nunca crea eventos parciales:
 * devuelve datos completos o `null`, y `ImportService` persiste una sola vez con lo devuelto.
 */
export class CompositeEventExtractionAdapter implements EventExtractionAdapter {
  constructor(
    private readonly estructurado: EventExtractionAdapter,
    private readonly motorIA: MotorExtraccionIA | null,
    private readonly limites: LimitesExtraccionUrl,
    private readonly renderizador: RenderizadorNavegador | null = null,
    private readonly registrar: RegistrarTelemetria = () => {},
  ) {}

  async extraer(fuente: FuenteImportacion, payload: string): Promise<DatosEventoExtraidos | null> {
    if (pareceJsonEstructurado(payload)) {
      return this.estructurado.extraer(fuente, payload);
    }
    if (!esUrlPublicaCandidata(payload)) {
      return null;
    }
    if (!this.motorIA) {
      return null; // degradación controlada sin clave de IA (FR-012)
    }
    return this.extraerDeUrl(payload.trim(), this.motorIA);
  }

  private async extraerDeUrl(url: string, motor: MotorExtraccionIA): Promise<DatosEventoExtraidos | null> {
    const inicio = Date.now();
    const deadline = inicio + PRESUPUESTO_TOTAL_MS;
    // La ruta ligera usa todo el presupuesto salvo que el render pueda entrar en juego (plan.md, F1).
    const topeLigero = this.renderizador ? Math.min(Date.now() + LIGERA_MS, deadline) : deadline;

    const ligero = await this.extraerLigero(url, motor, topeLigero);
    if (contarSesiones(ligero) >= 1) {
      this.registrar({ url, ruta: 'ligera', render_usado: false, duracion_ms: Date.now() - inicio, resultado: 'exito' });
      return ligero;
    }

    if (this.renderizador && deadline - Date.now() > 0) {
      const r = await this.renderConIA(url, motor, deadline, this.renderizador);
      if (contarSesiones(r.datos) >= 1) {
        this.registrar({ url, ruta: 'render', render_usado: true, estado_render: r.estado, solicitudes_bloqueadas: r.bloqueadas, duracion_ms: Date.now() - inicio, resultado: 'exito' });
        return r.datos;
      }
      // Fallback: conservar el resultado ligero útil o degradar a ilegible (FR-011, US2).
      this.registrar({ url, ruta: 'render', render_usado: true, estado_render: r.estado, solicitudes_bloqueadas: r.bloqueadas, duracion_ms: Date.now() - inicio, resultado: ligero ? 'parcial' : 'ilegible' });
      return ligero;
    }

    this.registrar({ url, ruta: 'ligera', render_usado: false, duracion_ms: Date.now() - inicio, resultado: ligero ? 'parcial' : 'ilegible' });
    return ligero;
  }

  private async extraerLigero(
    url: string,
    motor: MotorExtraccionIA,
    deadline: number,
  ): Promise<DatosEventoExtraidos | null> {
    const contenido = await obtenerHtml(url, { deadline, maxBytes: this.limites.maxHtmlBytes });
    if (!contenido) return null;
    const texto = htmlATexto(contenido.html, this.limites.maxChars);
    if (!texto) return null;
    return motor.estructurar(texto, deadline);
  }

  private async renderConIA(
    url: string,
    motor: MotorExtraccionIA,
    deadline: number,
    renderizador: RenderizadorNavegador,
  ): Promise<ResultadoRenderIA> {
    const render = await renderizador.renderizar(url, Math.min(Date.now() + RENDER_MS, deadline));
    if (!render.html) return { datos: null, estado: render.estado, bloqueadas: render.solicitudes_bloqueadas };
    const texto = htmlATexto(render.html, this.limites.maxChars);
    if (!texto) return { datos: null, estado: render.estado, bloqueadas: render.solicitudes_bloqueadas };
    const iaDeadline = Math.min(Date.now() + IA_RENDER_MS, deadline);
    const datos = await motor.estructurar(texto, iaDeadline);
    return { datos, estado: render.estado, bloqueadas: render.solicitudes_bloqueadas };
  }
}
