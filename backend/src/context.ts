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
} from './integrations/event-extraction.js';
import { StubMapsProviderAdapter } from './integrations/maps-provider.js';
import { StubQuestionGenerationAdapter } from './integrations/question-generation.js';
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
const MAX_CHARS_POR_DEFECTO = 20_000;

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

export function createContext(dataDir?: string): AppContext {
  const repos = createRepositories(dataDir);
  const extractor = new CompositeEventExtractionAdapter(new StubEventExtractionAdapter(), crearMotorIA(), {
    maxHtmlBytes: Number(process.env.RUMBO_AI_MAX_HTML_BYTES) || MAX_HTML_BYTES_POR_DEFECTO,
    maxChars: Number(process.env.RUMBO_AI_MAX_CHARS) || MAX_CHARS_POR_DEFECTO,
  });
  const maps = new StubMapsProviderAdapter();
  const generadorPreguntas = new StubQuestionGenerationAdapter();
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
