import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate, mockObtenerHtml } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockObtenerHtml: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

vi.mock('../src/integrations/http-fetch.js', () => ({
  obtenerHtml: mockObtenerHtml,
}));

import {
  AnthropicEventExtractionAdapter,
  CompositeEventExtractionAdapter,
  StubEventExtractionAdapter,
  esDatosExtraidosValidos,
  esUrlPublicaCandidata,
  type DatosEventoExtraidos,
  type MotorExtraccionIA,
} from '../src/integrations/event-extraction.js';
import { ImportService } from '../src/services/import-service.js';
import { ApiError } from '../src/api/error-handler.js';
import type { Repositories } from '../src/repositories/index.js';
import type { RenderizadorNavegador, ResultadoRender } from '../src/integrations/browser-renderer.js';

const DATOS_VALIDOS: DatosEventoExtraidos = {
  nombre: 'AI Summit',
  fecha_inicio: '2026-09-01T09:00:00.000Z',
  fecha_fin: '2026-09-01T18:00:00.000Z',
  ubicacion: 'Londres',
  requisitos_acceso: null,
  sesiones: [
    {
      titulo: 'Keynote',
      inicio: '2026-09-01T09:00:00.000Z',
      fin: '2026-09-01T10:00:00.000Z',
      sala: 'Auditorio',
      tema: 'IA',
      ponentes: [{ nombre: 'Ada Lovelace', empresa: null }],
    },
  ],
  empresas: [],
};

function bloqueToolUse(input: unknown) {
  return { content: [{ type: 'tool_use', id: 'toolu_1', name: 'registrar_evento', input }] };
}

describe('esDatosExtraidosValidos', () => {
  it('acepta una estructura completa y coherente', () => {
    expect(esDatosExtraidosValidos(DATOS_VALIDOS)).toBe(true);
  });

  it('acepta nombre null si hay al menos una sesión (no todo tiene por qué extraerse)', () => {
    expect(esDatosExtraidosValidos({ ...DATOS_VALIDOS, nombre: null })).toBe(true);
  });

  it('rechaza una respuesta vacía (sin nombre y sin sesiones)', () => {
    expect(esDatosExtraidosValidos({ ...DATOS_VALIDOS, nombre: null, sesiones: [] })).toBe(false);
  });

  it('rechaza fechas no parseables', () => {
    expect(esDatosExtraidosValidos({ ...DATOS_VALIDOS, fecha_inicio: 'no-es-una-fecha' })).toBe(false);
  });

  it('rechaza fecha_fin anterior a fecha_inicio', () => {
    expect(
      esDatosExtraidosValidos({
        ...DATOS_VALIDOS,
        fecha_inicio: '2026-09-02T00:00:00.000Z',
        fecha_fin: '2026-09-01T00:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('rechaza una sesión sin título', () => {
    expect(
      esDatosExtraidosValidos({
        ...DATOS_VALIDOS,
        sesiones: [{ ...DATOS_VALIDOS.sesiones[0], titulo: '' }],
      }),
    ).toBe(false);
  });

  it('rechaza estructuras que no son objetos', () => {
    expect(esDatosExtraidosValidos(null)).toBe(false);
    expect(esDatosExtraidosValidos('texto')).toBe(false);
    expect(esDatosExtraidosValidos(undefined)).toBe(false);
  });
});

describe('esUrlPublicaCandidata', () => {
  it('acepta URLs http/https', () => {
    expect(esUrlPublicaCandidata('https://ejemplo.com/agenda')).toBe(true);
    expect(esUrlPublicaCandidata('  http://ejemplo.com  ')).toBe(true);
  });

  it('rechaza payloads que no son URLs http/https', () => {
    expect(esUrlPublicaCandidata('')).toBe(false);
    expect(esUrlPublicaCandidata('no es una url')).toBe(false);
    expect(esUrlPublicaCandidata('ftp://ejemplo.com')).toBe(false);
    expect(esUrlPublicaCandidata('{"nombre":"x"}')).toBe(false);
  });
});

describe('AnthropicEventExtractionAdapter', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('devuelve los datos cuando la tool call es válida (caso feliz)', async () => {
    mockCreate.mockResolvedValue(bloqueToolUse(DATOS_VALIDOS));
    const adapter = new AnthropicEventExtractionAdapter('clave-test', 'modelo-test');

    const resultado = await adapter.estructurar('texto de la página', Date.now() + 10_000);

    expect(resultado).toEqual(DATOS_VALIDOS);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const [params] = mockCreate.mock.calls[0];
    expect(params.tool_choice).toEqual({ type: 'tool', name: 'registrar_evento' });
  });

  it('devuelve null si la respuesta no incluye una tool call', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'no puedo ayudar con eso' }] });
    const adapter = new AnthropicEventExtractionAdapter('clave-test', 'modelo-test');

    expect(await adapter.estructurar('texto', Date.now() + 10_000)).toBeNull();
  });

  it('devuelve null si la tool call no pasa la validación de estructura', async () => {
    mockCreate.mockResolvedValue(bloqueToolUse({ ...DATOS_VALIDOS, sesiones: 'no-es-un-array' }));
    const adapter = new AnthropicEventExtractionAdapter('clave-test', 'modelo-test');

    expect(await adapter.estructurar('texto', Date.now() + 10_000)).toBeNull();
  });

  it('devuelve null si la llamada falla o se aborta por timeout', async () => {
    mockCreate.mockRejectedValue(new Error('aborted'));
    const adapter = new AnthropicEventExtractionAdapter('clave-test', 'modelo-test');

    expect(await adapter.estructurar('texto', Date.now() + 10_000)).toBeNull();
  });

  it('devuelve null sin llamar a la IA si el presupuesto de tiempo ya se agotó', async () => {
    const adapter = new AnthropicEventExtractionAdapter('clave-test', 'modelo-test');

    const resultado = await adapter.estructurar('texto', Date.now() - 1);

    expect(resultado).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('CompositeEventExtractionAdapter', () => {
  beforeEach(() => {
    mockObtenerHtml.mockReset();
  });

  const limites = { maxHtmlBytes: 1_000_000, maxChars: 20_000 };

  it('el camino JSON estructurado nunca invoca a la IA (FR-007)', async () => {
    const motorIA: MotorExtraccionIA = { estructurar: vi.fn() };
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motorIA, limites);
    const payload = JSON.stringify({ nombre: 'Demo', sesiones: [] });

    const resultado = await composite.extraer('url', payload);

    expect(resultado?.nombre).toBe('Demo');
    expect(motorIA.estructurar).not.toHaveBeenCalled();
    expect(mockObtenerHtml).not.toHaveBeenCalled();
  });

  it('degrada a ilegible sin llamar a red cuando no hay motor de IA configurado (FR-012)', async () => {
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), null, limites);

    const resultado = await composite.extraer('url', 'https://ejemplo.com/agenda');

    expect(resultado).toBeNull();
    expect(mockObtenerHtml).not.toHaveBeenCalled();
  });

  it('devuelve null para un payload que no es ni JSON ni una URL http/https', async () => {
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), null, limites);

    expect(await composite.extraer('url', 'esto no es nada reconocible')).toBeNull();
  });

  it('orquesta obtenerHtml → htmlATexto → motor.estructurar para una URL real', async () => {
    mockObtenerHtml.mockResolvedValue({ html: '<h1>Evento</h1>', urlFinal: 'https://ejemplo.com/agenda' });
    const motorIA: MotorExtraccionIA = { estructurar: vi.fn().mockResolvedValue(DATOS_VALIDOS) };
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motorIA, limites);

    const resultado = await composite.extraer('url', 'https://ejemplo.com/agenda');

    expect(resultado).toEqual(DATOS_VALIDOS);
    expect(mockObtenerHtml).toHaveBeenCalledWith(
      'https://ejemplo.com/agenda',
      expect.objectContaining({ maxBytes: limites.maxHtmlBytes }),
    );
    expect(motorIA.estructurar).toHaveBeenCalledWith('Evento', expect.any(Number));
  });

  it('devuelve null sin llamar a la IA si obtenerHtml falla (URL ilegible)', async () => {
    mockObtenerHtml.mockResolvedValue(null);
    const motorIA: MotorExtraccionIA = { estructurar: vi.fn() };
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motorIA, limites);

    const resultado = await composite.extraer('url', 'https://caida.example/agenda');

    expect(resultado).toBeNull();
    expect(motorIA.estructurar).not.toHaveBeenCalled();
  });
});

describe('CompositeEventExtractionAdapter (escalado al render, feature 004)', () => {
  beforeEach(() => {
    mockObtenerHtml.mockReset();
  });

  const limites = { maxHtmlBytes: 1_000_000, maxChars: 20_000 };
  const soloNombre: DatosEventoExtraidos = { ...DATOS_VALIDOS, sesiones: [] };

  function fakeRenderizador(res: ResultadoRender): RenderizadorNavegador {
    return { renderizar: vi.fn().mockResolvedValue(res), cerrar: vi.fn() };
  }

  const renderCompletado: ResultadoRender = {
    estado: 'completado',
    html: '<h1>DOM renderizado</h1>',
    solicitudes_bloqueadas: 0,
    duracion_ms: 5,
  };

  it('la vía ligera con sesiones no invoca el render (T012, FR-004)', async () => {
    mockObtenerHtml.mockResolvedValue({ html: '<h1>x</h1>', urlFinal: 'https://x.com/a' });
    const motor: MotorExtraccionIA = { estructurar: vi.fn().mockResolvedValue(DATOS_VALIDOS) };
    const rend = fakeRenderizador(renderCompletado);
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motor, limites, rend);

    const res = await composite.extraer('url', 'https://x.com/a');

    expect(res).toEqual(DATOS_VALIDOS);
    expect(rend.renderizar).not.toHaveBeenCalled();
  });

  it('escala al render cuando la vía ligera da 0 sesiones y el render gana (T012, FR-004)', async () => {
    mockObtenerHtml.mockResolvedValue({ html: '<h1>solo nombre</h1>', urlFinal: 'https://x.com/a' });
    const motor: MotorExtraccionIA = {
      estructurar: vi.fn().mockResolvedValueOnce(soloNombre).mockResolvedValueOnce(DATOS_VALIDOS),
    };
    const rend = fakeRenderizador(renderCompletado);
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motor, limites, rend);

    const res = await composite.extraer('url', 'https://x.com/a');

    expect(res).toEqual(DATOS_VALIDOS);
    expect(rend.renderizar).toHaveBeenCalledTimes(1);
  });

  it('escala al render cuando la vía ligera es ilegible (obtenerHtml null) (T012)', async () => {
    mockObtenerHtml.mockResolvedValue(null);
    const motor: MotorExtraccionIA = { estructurar: vi.fn().mockResolvedValue(DATOS_VALIDOS) };
    const rend = fakeRenderizador(renderCompletado);
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motor, limites, rend);

    const res = await composite.extraer('url', 'https://x.com/a');

    expect(res).toEqual(DATOS_VALIDOS);
    expect(rend.renderizar).toHaveBeenCalledTimes(1);
  });

  it('conserva el resultado ligero parcial cuando el render falla (T012/T015, FR-011)', async () => {
    mockObtenerHtml.mockResolvedValue({ html: '<h1>solo nombre</h1>', urlFinal: 'https://x.com/a' });
    const motor: MotorExtraccionIA = { estructurar: vi.fn().mockResolvedValue(soloNombre) };
    const rend = fakeRenderizador({ estado: 'timeout', html: null, solicitudes_bloqueadas: 0, duracion_ms: 1 });
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motor, limites, rend);

    const res = await composite.extraer('url', 'https://x.com/a');

    expect(res).toEqual(soloNombre);
    expect(rend.renderizar).toHaveBeenCalledTimes(1);
  });

  it('sin renderizador la vía ligera decide por sí sola y propaga un deadline (T012, F1)', async () => {
    mockObtenerHtml.mockResolvedValue({ html: '<h1>solo nombre</h1>', urlFinal: 'https://x.com/a' });
    const motor: MotorExtraccionIA = { estructurar: vi.fn().mockResolvedValue(soloNombre) };
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motor, limites, null);

    const res = await composite.extraer('url', 'https://x.com/a');

    expect(res).toEqual(soloNombre);
    const [, deadline] = motor.estructurar.mock.calls[0];
    expect(typeof deadline).toBe('number');
    expect(deadline).toBeGreaterThan(Date.now());
  });

  it('regresión: JSON estructurado no invoca ni IA ni render (T021, FR-010)', async () => {
    const motor: MotorExtraccionIA = { estructurar: vi.fn() };
    const rend = fakeRenderizador(renderCompletado);
    const composite = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), motor, limites, rend);

    const res = await composite.extraer('url', JSON.stringify({ nombre: 'Demo', sesiones: [] }));

    expect(res?.nombre).toBe('Demo');
    expect(motor.estructurar).not.toHaveBeenCalled();
    expect(rend.renderizar).not.toHaveBeenCalled();
    expect(mockObtenerHtml).not.toHaveBeenCalled();
  });
});

describe('ImportService no crea datos parciales ante fuente ilegible (T019, FR-009/US2)', () => {
  it('lanza fuente_ilegible sin persistir ni filtrar detalles internos', async () => {
    const crearEvento = vi.fn();
    const repos = { eventos: { create: crearEvento } } as unknown as Repositories;
    const extractorNulo = { extraer: vi.fn().mockResolvedValue(null) };
    const service = new ImportService(repos, extractorNulo);

    await expect(service.importar('url', 'https://x.com/a')).rejects.toMatchObject({
      statusCode: 422,
      codigo: 'fuente_ilegible',
    });
    expect(crearEvento).not.toHaveBeenCalled();

    const error = await service.importar('url', 'https://x.com/a').catch((e: ApiError) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).not.toMatch(/key|chrome|chromium|proxy|127\.0\.0\.1|anthropic/i);
  });
});
