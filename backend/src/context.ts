/**
 * Contenedor de dependencias de la aplicación. Cablea repositorios, adaptadores de integración
 * (stub en el MVP) y servicios. Permite inyectar un directorio de datos aislado en pruebas.
 */
import { createRepositories, type Repositories } from './repositories/index.js';
import {
  AnthropicEventExtractionAdapter,
  CompositeEventExtractionAdapter,
  StubEventExtractionAdapter,
  type MotorExtraccionIA,
  type RegistrarTelemetria,
} from './integrations/event-extraction.js';
import { PlaywrightRenderizador } from './integrations/browser-renderer.js';
import { renderHabilitado } from './integrations/render-config.js';
import { StubMapsProviderAdapter } from './integrations/maps-provider.js';
import {
  AnthropicQuestionGenerationAdapter,
  StubQuestionGenerationAdapter,
  type QuestionGenerationAdapter,
} from './integrations/question-generation.js';
import { StubVoiceTranscriptionAdapter } from './integrations/voice-transcription.js';
import { ImportService } from './services/import-service.js';
import { GoalsService } from './services/goals-service.js';
import { AgendaService } from './services/agenda-service.js';
import { EventsListService } from './services/events-list-service.js';
import { LogisticsService } from './services/logistics-service.js';
import { QuestionsService } from './services/questions-service.js';
import { NotesService } from './services/notes-service.js';
import { ContactsService } from './services/contacts-service.js';

export interface AppContext {
  repos: Repositories;
  importService: ImportService;
  goalsService: GoalsService;
  agendaService: AgendaService;
  eventsListService: EventsListService;
  logisticsService: LogisticsService;
  questionsService: QuestionsService;
  notesService: NotesService;
  contactsService: ContactsService;
}

const MODELO_IA_POR_DEFECTO = 'claude-haiku-4-5-20251001';
const MAX_HTML_BYTES_POR_DEFECTO = 2 * 1024 * 1024;
const MAX_CHARS_POR_DEFECTO = 60_000;

/**
 * Construye el motor de IA real si hay clave configurada; si no, degrada de forma controlada
 * (FR-012): el camino de importación por URL devolverá "fuente ilegible" sin intentar red.
 */
function crearMotorIA(): MotorExtraccionIA | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      '[rumbo] ANTHROPIC_API_KEY no está configurada: importar eventos por URL degradará a "fuente ilegible" (feature 003, FR-012).',
    );
    return null;
  }
  return new AnthropicEventExtractionAdapter(apiKey, process.env.RUMBO_AI_MODEL ?? MODELO_IA_POR_DEFECTO);
}

/**
 * Construye el generador de preguntas con IA si hay clave configurada; en modo test o sin clave,
 * degrada a Stub o fallback controlado (feature 005, FR-009, FR-012).
 */
function crearGeneradorPreguntas(): QuestionGenerationAdapter {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.RUMBO_QUESTIONS_STUB === 'true' ||
    apiKey?.startsWith('e2e-fake')
  ) {
    return new StubQuestionGenerationAdapter();
  }
  if (!apiKey) {
    console.warn(
      '[rumbo] ANTHROPIC_API_KEY no está configurada: generar preguntas degradará a "servicio_ia_no_disponible" (feature 005, FR-009).',
    );
    return {
      generar: async () => null,
    };
  }
  return new AnthropicQuestionGenerationAdapter(
    apiKey,
    process.env.RUMBO_AI_MODEL ?? MODELO_IA_POR_DEFECTO,
  );
}

export function createContext(dataDir?: string): AppContext {
  const repos = createRepositories(dataDir);
  const motorIA = crearMotorIA();
  // El render solo tiene sentido con IA configurada; sin ella la vía de URL ya degrada antes (FR-012).
  const renderizador = motorIA && renderHabilitado() ? new PlaywrightRenderizador() : null;
  if (motorIA && !renderHabilitado()) {
    console.warn('[rumbo] RUMBO_RENDER_ENABLED=false: importar por URL usará solo la vía ligera (feature 004, FR-011).');
  }
  // Telemetría segura: solo campos no sensibles (FR-012); nunca HTML, texto, cookies ni credenciales.
  const registrarTelemetria: RegistrarTelemetria = (t) => console.info('[rumbo][import]', JSON.stringify(t));
  const extractor = new CompositeEventExtractionAdapter(
    new StubEventExtractionAdapter(),
    motorIA,
    {
      maxHtmlBytes: Number(process.env.RUMBO_AI_MAX_HTML_BYTES) || MAX_HTML_BYTES_POR_DEFECTO,
      maxChars: Number(process.env.RUMBO_AI_MAX_CHARS) || MAX_CHARS_POR_DEFECTO,
    },
    renderizador,
    registrarTelemetria,
  );
  const maps = new StubMapsProviderAdapter();
  const generadorPreguntas = crearGeneradorPreguntas();
  const transcriptor = new StubVoiceTranscriptionAdapter();
  return {
    repos,
    importService: new ImportService(repos, extractor),
    goalsService: new GoalsService(repos),
    agendaService: new AgendaService(repos),
    eventsListService: new EventsListService(repos),
    logisticsService: new LogisticsService(repos, maps),
    questionsService: new QuestionsService(repos, generadorPreguntas),
    notesService: new NotesService(repos, transcriptor),
    contactsService: new ContactsService(repos),
  };
}
