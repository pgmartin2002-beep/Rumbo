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
