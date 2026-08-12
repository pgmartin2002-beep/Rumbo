/**
 * Contenedor de dependencias de la aplicación. Cablea repositorios, adaptadores de integración
 * (stub en el MVP) y servicios. Permite inyectar un directorio de datos aislado en pruebas.
 */
import { createRepositories, type Repositories } from './repositories/index.js';
import { StubEventExtractionAdapter } from './integrations/event-extraction.js';
import { StubMapsProviderAdapter } from './integrations/maps-provider.js';
import { ImportService } from './services/import-service.js';
import { GoalsService } from './services/goals-service.js';
import { AgendaService } from './services/agenda-service.js';
import { EventsListService } from './services/events-list-service.js';
import { LogisticsService } from './services/logistics-service.js';

export interface AppContext {
  repos: Repositories;
  importService: ImportService;
  goalsService: GoalsService;
  agendaService: AgendaService;
  eventsListService: EventsListService;
  logisticsService: LogisticsService;
}

export function createContext(dataDir?: string): AppContext {
  const repos = createRepositories(dataDir);
  const extractor = new StubEventExtractionAdapter();
  const maps = new StubMapsProviderAdapter();
  return {
    repos,
    importService: new ImportService(repos, extractor),
    goalsService: new GoalsService(repos),
    agendaService: new AgendaService(repos),
    eventsListService: new EventsListService(repos),
    logisticsService: new LogisticsService(repos, maps),
  };
}
