/**
 * Contenedor de dependencias de la aplicación. Cablea repositorios, adaptadores de integración
 * (stub en el MVP) y servicios. Permite inyectar un directorio de datos aislado en pruebas.
 */
import { createRepositories, type Repositories } from './repositories/index.js';
import { StubEventExtractionAdapter } from './integrations/event-extraction.js';
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

export function createContext(dataDir?: string): AppContext {
  const repos = createRepositories(dataDir);
  const extractor = new StubEventExtractionAdapter();
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
