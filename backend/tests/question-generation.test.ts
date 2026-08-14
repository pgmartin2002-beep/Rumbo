import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import {
  AnthropicQuestionGenerationAdapter,
  StubQuestionGenerationAdapter,
  construirPromptUsuario,
  type ContextoGeneracionPreguntas,
} from '../src/integrations/question-generation.js';
import { esPreguntasGeneradasValidas } from '../src/models/validation.js';
import { QuestionsService } from '../src/services/questions-service.js';
import { createRepositories, type Repositories } from '../src/repositories/index.js';
import { ApiError } from '../src/api/error-handler.js';

const CONTEXTO_VALIDO: ContextoGeneracionPreguntas = {
  eventoNombre: 'Tech Conf 2026',
  sesionTitulo: 'Arquitectura de Agentes de IA',
  sesionTema: 'Patrones de diseño para sistemas multi-agente en producción',
  ponentes: [{ nombre: 'Ada Lovelace', empresa: 'Analytical Engines Inc.' }],
  objetivosUsuario: ['aprender', 'networking'],
};

const PREGUNTAS_VALIDAS = {
  preguntas: [
    { texto: '¿Cuál es el principal impacto en negocio que habéis observado?', tipo: 'general' },
    { texto: '¿Cómo abordáis el alineamiento entre equipos?', tipo: 'general' },
    { texto: '¿Qué patrón usáis para gestionar la memoria persistente?', tipo: 'tecnica' },
    { texto: '¿Cómo resolvéis el control de latencia en llamadas encadenadas?', tipo: 'tecnica' },
  ],
};

function bloqueToolUse(input: unknown) {
  return { content: [{ type: 'tool_use', id: 'toolu_123', name: 'generar_preguntas', input }] };
}

describe('esPreguntasGeneradasValidas', () => {
  it('acepta una respuesta con exactamente 4 preguntas (2 generales y 2 técnicas)', () => {
    expect(esPreguntasGeneradasValidas(PREGUNTAS_VALIDAS)).toBe(true);
  });

  it('rechaza si no hay exactamente 4 preguntas', () => {
    expect(
      esPreguntasGeneradasValidas({
        preguntas: PREGUNTAS_VALIDAS.preguntas.slice(0, 3),
      }),
    ).toBe(false);
  });

  it('rechaza si el texto de alguna pregunta está vacío', () => {
    expect(
      esPreguntasGeneradasValidas({
        preguntas: [
          ...PREGUNTAS_VALIDAS.preguntas.slice(0, 3),
          { texto: '   ', tipo: 'tecnica' },
        ],
      }),
    ).toBe(false);
  });

  it('rechaza si el tipo es inválido', () => {
    expect(
      esPreguntasGeneradasValidas({
        preguntas: [
          ...PREGUNTAS_VALIDAS.preguntas.slice(0, 3),
          { texto: '¿Alguna duda?', tipo: 'otra' },
        ],
      }),
    ).toBe(false);
  });

  it('rechaza si todas son generales o todas son técnicas', () => {
    expect(
      esPreguntasGeneradasValidas({
        preguntas: PREGUNTAS_VALIDAS.preguntas.map((p) => ({ ...p, tipo: 'general' })),
      }),
    ).toBe(false);
  });

  it('rechaza objetos nulos o no válidos', () => {
    expect(esPreguntasGeneradasValidas(null)).toBe(false);
    expect(esPreguntasGeneradasValidas({})).toBe(false);
  });
});

describe('StubQuestionGenerationAdapter', () => {
  it('genera 4 preguntas categorizadas cuando hay tema o título', async () => {
    const stub = new StubQuestionGenerationAdapter();
    const resultado = await stub.generar(CONTEXTO_VALIDO);
    expect(resultado).toHaveLength(4);
    expect(resultado?.filter((p) => p.tipo === 'general')).toHaveLength(2);
    expect(resultado?.filter((p) => p.tipo === 'tecnica')).toHaveLength(2);
    expect(resultado?.[0].texto).toContain('Ada Lovelace');
  });

  it('devuelve null si tema y título están vacíos', async () => {
    const stub = new StubQuestionGenerationAdapter();
    const resultado = await stub.generar({
      ...CONTEXTO_VALIDO,
      sesionTema: null,
      sesionTitulo: '',
    });
    expect(resultado).toBeNull();
  });
});

describe('AnthropicQuestionGenerationAdapter', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('devuelve preguntas estructuradas cuando la API de Anthropic responde con éxito', async () => {
    mockCreate.mockResolvedValue(bloqueToolUse(PREGUNTAS_VALIDAS));

    const adapter = new AnthropicQuestionGenerationAdapter('test-key', 'claude-3-5-haiku');
    const resultado = await adapter.generar(CONTEXTO_VALIDO);

    expect(resultado).toEqual(PREGUNTAS_VALIDAS.preguntas);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.tool_choice).toEqual({ type: 'tool', name: 'generar_preguntas' });
  });

  it('devuelve null cuando la llamada a la API lanza una excepción (timeout o error)', async () => {
    mockCreate.mockRejectedValue(new Error('AbortError / Timeout'));

    const adapter = new AnthropicQuestionGenerationAdapter('test-key', 'claude-3-5-haiku');
    const resultado = await adapter.generar(CONTEXTO_VALIDO);

    expect(resultado).toBeNull();
  });

  it('devuelve null cuando la respuesta no contiene un bloque tool_use', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'Hola' }] });

    const adapter = new AnthropicQuestionGenerationAdapter('test-key', 'claude-3-5-haiku');
    const resultado = await adapter.generar(CONTEXTO_VALIDO);

    expect(resultado).toBeNull();
  });

  it('devuelve null cuando la respuesta de la tool no cumple el esquema', async () => {
    mockCreate.mockResolvedValue(bloqueToolUse({ preguntas: [] }));

    const adapter = new AnthropicQuestionGenerationAdapter('test-key', 'claude-3-5-haiku');
    const resultado = await adapter.generar(CONTEXTO_VALIDO);

    expect(resultado).toBeNull();
  });
});

describe('QuestionsService', () => {
  let tempDir: string;
  let repos: Repositories;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'rumbo-questions-test-'));
    repos = createRepositories(tempDir);
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  async function crearSesionFixture() {
    const evento = await repos.eventos.create({
      nombre: 'AI Summit',
      fecha_inicio: '2026-09-01T09:00:00.000Z',
      fecha_fin: '2026-09-01T18:00:00.000Z',
      ubicacion: 'Madrid',
      requisitos_acceso: null,
      fuente_importacion: 'url',
      fuente_valor: null,
      progreso_onboarding: 'importado',
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    });

    const ponente = await repos.ponentes.create({
      nombre: 'Alan Turing',
      empresa: 'Bletchley Labs',
    });

    const sesion = await repos.sesiones.create({
      evento_id: evento.id,
      titulo: 'Modelos Fundacionales',
      inicio: '2026-09-01T10:00:00.000Z',
      fin: '2026-09-01T11:00:00.000Z',
      sala: 'Sala Turing',
      tema: 'Arquitecturas de transformers y fine-tuning',
      ponente_ids: [ponente.id],
    });

    return { evento, ponente, sesion };
  }

  it('generar: persiste 4 preguntas sugeridas con tipo y origen "sugerida"', async () => {
    const { evento, sesion } = await crearSesionFixture();
    const service = new QuestionsService(repos, new StubQuestionGenerationAdapter());

    const preguntas = await service.generar(evento.id, sesion.id);

    expect(preguntas).toHaveLength(4);
    expect(preguntas.every((p) => p.origen === 'sugerida')).toBe(true);
    expect(preguntas.filter((p) => p.tipo === 'general')).toHaveLength(2);
    expect(preguntas.filter((p) => p.tipo === 'tecnica')).toHaveLength(2);
  });

  it('generar: lanza 422 informacion_insuficiente si la sesión no tiene tema', async () => {
    const { evento } = await crearSesionFixture();
    const sesionSinTema = await repos.sesiones.create({
      evento_id: evento.id,
      titulo: 'Sesión sin tema',
      inicio: '2026-09-01T10:00:00.000Z',
      fin: '2026-09-01T11:00:00.000Z',
      sala: null,
      tema: null,
      ponente_ids: [],
    });

    const service = new QuestionsService(repos, new StubQuestionGenerationAdapter());

    await expect(service.generar(evento.id, sesionSinTema.id)).rejects.toThrowError(
      expect.objectContaining({ codigo: 'informacion_insuficiente', statusCode: 422 }),
    );
  });

  it('generar: lanza 503 servicio_ia_no_disponible si el adaptador devuelve null', async () => {
    const { evento, sesion } = await crearSesionFixture();
    const adapterFails = { generar: async () => null };
    const service = new QuestionsService(repos, adapterFails);

    await expect(service.generar(evento.id, sesion.id)).rejects.toThrowError(
      expect.objectContaining({ codigo: 'servicio_ia_no_disponible', statusCode: 503 }),
    );
  });

  it('generar: maneja timeout de 15s de Anthropic y lanza 503 servicio_ia_no_disponible (US3, SC-002)', async () => {
    const { evento, sesion } = await crearSesionFixture();
    mockCreate.mockRejectedValueOnce(new Error('The operation was aborted due to timeout'));

    const anthropicAdapter = new AnthropicQuestionGenerationAdapter('test-key', 'claude-3-5-haiku');
    const service = new QuestionsService(repos, anthropicAdapter);

    await expect(service.generar(evento.id, sesion.id)).rejects.toThrowError(
      expect.objectContaining({ codigo: 'servicio_ia_no_disponible', statusCode: 503 }),
    );
  });

  it('regenerar: reemplaza las preguntas sugeridas previas y PRESERVA las manuales (US2 & SC-003)', async () => {
    const { evento, sesion } = await crearSesionFixture();
    const service = new QuestionsService(repos, new StubQuestionGenerationAdapter());

    // 1. Generación inicial
    await service.generar(evento.id, sesion.id);

    // 2. Añadir pregunta manual
    const manual = await service.agregarManual(
      evento.id,
      sesion.id,
      '¿Tenéis planeado soporte para español?',
    );

    expect(manual.origen).toBe('manual');

    // 3. Regenerar
    const resultado = await service.generar(evento.id, sesion.id);

    // 4 sugeridas + 1 manual = 5
    expect(resultado).toHaveLength(5);
    const manuales = resultado.filter((p) => p.origen === 'manual');
    expect(manuales).toHaveLength(1);
    expect(manuales[0].texto).toBe('¿Tenéis planeado soporte para español?');
    expect(manuales[0].id).toBe(manual.id);

    const sugeridas = resultado.filter((p) => p.origen === 'sugerida');
    expect(sugeridas).toHaveLength(4);
  });
});
