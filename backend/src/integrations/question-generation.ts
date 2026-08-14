/**
 * Adaptador de generación de preguntas (motor externo). El cliente NUNCA lo llama directamente;
 * solo el backend (Principio VI).
 *
 * `StubQuestionGenerationAdapter` genera 4 preguntas deterministas (2 generales y 2 técnicas)
 * a partir del contexto para entornos de test y demos.
 * `AnthropicQuestionGenerationAdapter` utiliza Claude de Anthropic mediante tool use forzado
 * para estructurar 4 preguntas enriquecidas.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { TipoPregunta } from '../models/index.js';
import { esPreguntasGeneradasValidas } from '../models/validation.js';

export interface ContextoGeneracionPreguntas {
  eventoNombre: string | null;
  sesionTitulo: string;
  sesionTema: string | null;
  ponentes: {
    nombre: string;
    empresa: string | null;
  }[];
  objetivosUsuario: string[];
}

export interface PreguntaGenerada {
  texto: string;
  tipo: TipoPregunta;
}

export interface RespuestaGeneracionTool {
  preguntas: PreguntaGenerada[];
}

export interface QuestionGenerationAdapter {
  /** Devuelve 4 preguntas categorizadas (2 generales y 2 técnicas), o null si la información es insuficiente o falla. */
  generar(contexto: ContextoGeneracionPreguntas): Promise<PreguntaGenerada[] | null>;
}

export class StubQuestionGenerationAdapter implements QuestionGenerationAdapter {
  async generar(contexto: ContextoGeneracionPreguntas): Promise<PreguntaGenerada[] | null> {
    const tema = contexto.sesionTema?.trim();
    const titulo = contexto.sesionTitulo?.trim();
    const nucleo = tema || titulo;
    if (!nucleo) return null;

    const primerPonente = contexto.ponentes[0]?.nombre;

    const g1 = primerPonente
      ? `${primerPonente}, ¿cuál ha sido el mayor reto al aplicar ${nucleo}?`
      : `¿Qué es lo que más te está aportando de "${nucleo}" hasta ahora?`;
    const g2 = `¿Cómo encaja "${nucleo}" con los objetivos de negocio y adopción en el sector?`;

    const t1 = `¿Qué retos técnicos o de arquitectura habéis encontrado al implementar ${nucleo}?`;
    const t2 = `¿Qué herramientas y buenas prácticas recomendáis para empezar con ${nucleo}?`;

    return [
      { texto: g1, tipo: 'general' },
      { texto: g2, tipo: 'general' },
      { texto: t1, tipo: 'tecnica' },
      { texto: t2, tipo: 'tecnica' },
    ];
  }
}

const TIMEOUT_GENERACION_MS = 15_000;

const GENERAR_PREGUNTAS_TOOL = {
  name: 'generar_preguntas',
  description:
    'Genera exactamente 4 preguntas estructuradas (2 generales/estratégicas y 2 técnicas/profundas) para preparar la asistencia a una sesión de un evento.',
  input_schema: {
    type: 'object' as const,
    properties: {
      preguntas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            texto: {
              type: 'string',
              description: 'Texto formulado de la pregunta, directo, profesional y conciso.',
            },
            tipo: {
              type: 'string',
              enum: ['general', 'tecnica'],
              description:
                'Categoría de la pregunta: "general" para visión estratégica/negocio, o "tecnica" para arquitectura/implementación/retos.',
            },
          },
          required: ['texto', 'tipo'],
        },
        minItems: 4,
        maxItems: 4,
        description:
          'Lista de exactamente 4 preguntas: 2 de tipo "general" y 2 de tipo "tecnica".',
      },
    },
    required: ['preguntas'],
  },
};

const SYSTEM_PROMPT = [
  'Eres un asistente experto para asistentes a conferencias y eventos profesionales.',
  'Tu objetivo es formular exactamente 4 preguntas inteligentes y relevantes para una sesión:',
  '2 preguntas de tipo "general" (impacto estratégico, negocio, visión de sector, adopción organizativa)',
  'y 2 preguntas de tipo "tecnica" (arquitectura, retos de implementación, dependencias, tooling, rendimiento).',
  'Formula preguntas directas, útiles para el turno de preguntas (Q&A) o networking con ponentes.',
  'Usa el contexto del evento, el título de la sesión, el tema/descripción, los ponentes y los objetivos del asistente.',
  'Devuelve el resultado únicamente llamando a la herramienta generar_preguntas, sin texto adicional.',
].join(' ');

export function construirPromptUsuario(contexto: ContextoGeneracionPreguntas): string {
  const lineas: string[] = [];
  if (contexto.eventoNombre) {
    lineas.push(`Evento: ${contexto.eventoNombre}`);
  }
  lineas.push(`Título de la sesión: ${contexto.sesionTitulo}`);
  if (contexto.sesionTema) {
    lineas.push(`Tema / Descripción: ${contexto.sesionTema}`);
  }
  if (contexto.ponentes.length > 0) {
    const ponentesStr = contexto.ponentes
      .map((p) => (p.empresa ? `${p.nombre} (${p.empresa})` : p.nombre))
      .join(', ');
    lineas.push(`Ponentes: ${ponentesStr}`);
  }
  if (contexto.objetivosUsuario.length > 0) {
    lineas.push(`Objetivos del asistente en este evento: ${contexto.objetivosUsuario.join(', ')}`);
  }
  lineas.push('Genera 2 preguntas generales y 2 preguntas técnicas para esta sesión.');
  return lineas.join('\n');
}

export class AnthropicQuestionGenerationAdapter implements QuestionGenerationAdapter {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly modelo: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async generar(contexto: ContextoGeneracionPreguntas): Promise<PreguntaGenerada[] | null> {
    const promptUsuario = construirPromptUsuario(contexto);
    let respuesta: Anthropic.Messages.Message;
    try {
      respuesta = await this.client.messages.create(
        {
          model: this.modelo,
          max_tokens: Number(process.env.RUMBO_AI_MAX_TOKENS) || 1_024,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          tools: [GENERAR_PREGUNTAS_TOOL],
          tool_choice: { type: 'tool', name: 'generar_preguntas' },
          messages: [{ role: 'user', content: promptUsuario }],
        },
        { signal: AbortSignal.timeout(TIMEOUT_GENERACION_MS) },
      );
    } catch {
      return null;
    }

    const bloqueTool = respuesta.content.find(
      (bloque): bloque is Anthropic.Messages.ToolUseBlock => bloque.type === 'tool_use',
    );
    if (!bloqueTool) return null;

    if (!esPreguntasGeneradasValidas(bloqueTool.input)) {
      return null;
    }

    return bloqueTool.input.preguntas;
  }
}
