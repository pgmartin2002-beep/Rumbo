/**
 * Registro central de repositorios JSON, tipados por entidad. Todas las colecciones comparten
 * el mismo directorio de datos (configurable para aislar pruebas).
 */
import path from 'node:path';
import { JsonRepository } from './json-repository.js';
import type {
  AgendaPersonalizada,
  AlertaLogistica,
  Contacto,
  EmpresaParticipante,
  Evento,
  Nota,
  PerfilObjetivos,
  Ponente,
  PreguntaPreparada,
  Ruta,
  Sesion,
} from '../models/index.js';

export interface Repositories {
  eventos: JsonRepository<Evento>;
  sesiones: JsonRepository<Sesion>;
  ponentes: JsonRepository<Ponente>;
  empresas: JsonRepository<EmpresaParticipante>;
  perfilesObjetivos: JsonRepository<PerfilObjetivos>;
  agendas: JsonRepository<AgendaPersonalizada>;
  rutas: JsonRepository<Ruta>;
  alertas: JsonRepository<AlertaLogistica>;
  preguntas: JsonRepository<PreguntaPreparada>;
  notas: JsonRepository<Nota>;
  contactos: JsonRepository<Contacto>;
}

export function createRepositories(dataDir?: string): Repositories {
  const dir = dataDir ?? process.env.RUMBO_DATA_DIR ?? path.resolve(process.cwd(), 'data');
  return {
    eventos: new JsonRepository<Evento>('eventos', dir),
    sesiones: new JsonRepository<Sesion>('sesiones', dir),
    ponentes: new JsonRepository<Ponente>('ponentes', dir),
    empresas: new JsonRepository<EmpresaParticipante>('empresas', dir),
    perfilesObjetivos: new JsonRepository<PerfilObjetivos>('perfiles_objetivos', dir),
    agendas: new JsonRepository<AgendaPersonalizada>('agendas', dir),
    rutas: new JsonRepository<Ruta>('rutas', dir),
    alertas: new JsonRepository<AlertaLogistica>('alertas', dir),
    preguntas: new JsonRepository<PreguntaPreparada>('preguntas', dir),
    notas: new JsonRepository<Nota>('notas', dir),
    contactos: new JsonRepository<Contacto>('contactos', dir),
  };
}
