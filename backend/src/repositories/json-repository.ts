/**
 * Capa de repositorio genérica sobre ficheros JSON (persistencia del MVP).
 * Una colección = un fichero `<dataDir>/<coleccion>.json` con un array de entidades.
 *
 * La interfaz `Repository<T>` es estable e independiente del almacenamiento: permite migrar a
 * una base de datos (p. ej. PostgreSQL) más adelante sin tocar la lógica de negocio
 * (research.md §3). El directorio de datos es configurable para aislar las pruebas.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface Entity {
  id: string;
}

export interface Repository<T extends Entity> {
  list(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findBy(predicate: (item: T) => boolean): Promise<T[]>;
  create(data: Omit<T, 'id'> & { id?: string }): Promise<T>;
  update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T | null>;
  upsertBy(match: (item: T) => boolean, data: Omit<T, 'id'> & { id?: string }): Promise<T>;
  delete(id: string): Promise<boolean>;
}

const DEFAULT_DATA_DIR = process.env.RUMBO_DATA_DIR ?? path.resolve(process.cwd(), 'data');

/**
 * Renombra reintentando ante bloqueos transitorios del sistema de ficheros. En Windows, el
 * antivirus/indexador puede retener brevemente el destino tras una escritura y hacer fallar el
 * `rename` con EPERM/EBUSY/EACCES; se reintenta con backoff antes de rendirse.
 */
async function renombrarConReintentos(origen: string, destino: string, intentos = 6): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      await fs.rename(origen, destino);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (i < intentos && (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES')) {
        await new Promise((r) => setTimeout(r, 25 * (i + 1)));
        continue;
      }
      await fs.rm(origen, { force: true }).catch(() => {});
      throw err;
    }
  }
}

export class JsonRepository<T extends Entity> implements Repository<T> {
  private readonly filePath: string;
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly collection: string,
    dataDir: string = DEFAULT_DATA_DIR,
  ) {
    this.filePath = path.join(dataDir, `${collection}.json`);
  }

  private async readAll(): Promise<T[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as T[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  /** Escritura serializada (write chain) para evitar corrupción por escrituras concurrentes. */
  private async writeAll(items: T[]): Promise<void> {
    const task = async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${randomUUID()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(items, null, 2), 'utf-8');
      await renombrarConReintentos(tmp, this.filePath);
    };
    this.writeChain = this.writeChain.then(task, task);
    await this.writeChain;
  }

  async list(): Promise<T[]> {
    return this.readAll();
  }

  async findById(id: string): Promise<T | null> {
    const items = await this.readAll();
    return items.find((i) => i.id === id) ?? null;
  }

  async findBy(predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.readAll();
    return items.filter(predicate);
  }

  async create(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    const items = await this.readAll();
    const entity = { ...data, id: data.id ?? randomUUID() } as T;
    items.push(entity);
    await this.writeAll(items);
    return entity;
  }

  async update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const items = await this.readAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated = { ...items[idx], ...patch, id } as T;
    items[idx] = updated;
    await this.writeAll(items);
    return updated;
  }

  async upsertBy(
    match: (item: T) => boolean,
    data: Omit<T, 'id'> & { id?: string },
  ): Promise<T> {
    const items = await this.readAll();
    const idx = items.findIndex(match);
    if (idx === -1) {
      const entity = { ...data, id: data.id ?? randomUUID() } as T;
      items.push(entity);
      await this.writeAll(items);
      return entity;
    }
    const updated = { ...items[idx], ...data, id: items[idx].id } as T;
    items[idx] = updated;
    await this.writeAll(items);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const items = await this.readAll();
    const next = items.filter((i) => i.id !== id);
    if (next.length === items.length) return false;
    await this.writeAll(next);
    return true;
  }
}
