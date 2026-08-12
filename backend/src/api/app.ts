import Fastify, { type FastifyInstance } from 'fastify';
import { createContext, type AppContext } from '../context.js';
import { registerErrorHandler } from './error-handler.js';
import { registerEventsList } from './routes/events-list.js';
import { registerEventsDetail } from './routes/events-detail.js';
import { registerEventsImport } from './routes/events-import.js';
import { registerEventsPatch } from './routes/events-patch.js';
import { registerEventsGoals } from './routes/events-goals.js';
import { registerEventsAgenda } from './routes/events-agenda.js';
import { registerEventsAgendaRecalc } from './routes/events-agenda-recalc.js';
import { registerEventsRoute } from './routes/events-route.js';
import { registerEventsAlerts } from './routes/events-alerts.js';

export interface BuildAppOptions {
  dataDir?: string;
  context?: AppContext;
  logger?: boolean;
}

/** Construye la instancia Fastify con todas las rutas del BFF (feature 001). */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });
  const ctx = options.context ?? createContext(options.dataDir);

  registerErrorHandler(app);

  app.get('/api/health', async () => ({ status: 'ok' }));

  // Historia 5 (Mis eventos) — el detalle se registra junto a la lista.
  registerEventsList(app, ctx);
  registerEventsDetail(app, ctx);
  // Historia 1 (Importar)
  registerEventsImport(app, ctx);
  registerEventsPatch(app, ctx);
  // Historia 2 (Objetivos)
  registerEventsGoals(app, ctx);
  // Historia 3 (Agenda)
  registerEventsAgenda(app, ctx);
  registerEventsAgendaRecalc(app, ctx);
  // Historia 4 (Logística)
  registerEventsRoute(app, ctx);
  registerEventsAlerts(app, ctx);

  return app;
}
