/**
 * Cola de sincronización offline (research.md R6, FR-017). Notas, notas de voz y contactos
 * creados sin conexión se guardan en IndexedDB con un `id` generado en cliente y se muestran de
 * inmediato en la UI; al recuperar conexión (evento `online` o carga de la app) se reintenta
 * enviarlos al backend en orden de creación. También cachea la última agenda obtenida con éxito
 * para que el modo simplificado (Historia 2) siga funcionando sin red.
 */
import { api, ApiClientError } from './api-client.js';
import type { Agenda } from './types.js';

const DB_NAME = 'rumbo-offline';
const DB_VERSION = 1;
const STORE_PENDIENTES = 'pendientes';
const STORE_AGENDA = 'agenda-cache';
const STORE_AUDIO = 'audio-pendiente';

export interface NotaPendientePayload {
  sesion_id: string | null;
  contenido: string;
}

export interface ContactoPendientePayload {
  sesion_id: string | null;
  nombre: string;
  nota?: string | null;
}

export type Pendiente =
  | { id: string; tipo: 'nota'; evento_id: string; creado_en: string; payload: NotaPendientePayload }
  | { id: string; tipo: 'nota-voz'; evento_id: string; creado_en: string; payload: { sesion_id: string | null } }
  | { id: string; tipo: 'contacto'; evento_id: string; creado_en: string; payload: ContactoPendientePayload };

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PENDIENTES)) {
        db.createObjectStore(STORE_PENDIENTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AGENDA)) {
        db.createObjectStore(STORE_AGENDA, { keyPath: 'evento_id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(storeName: string, value: unknown): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function eliminar(storeName: string, key: string): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function obtener<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function obtenerTodos<T>(storeName: string): Promise<T[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

export function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function encolarNota(eventoId: string, payload: NotaPendientePayload): Promise<Pendiente> {
  const pendiente: Pendiente = {
    id: crypto.randomUUID(),
    tipo: 'nota',
    evento_id: eventoId,
    creado_en: new Date().toISOString(),
    payload,
  };
  await put(STORE_PENDIENTES, pendiente);
  return pendiente;
}

/** Guarda el audio localmente; la transcripción requiere conexión (FR-017) y se hace al sincronizar. */
export async function encolarNotaVoz(
  eventoId: string,
  sesionId: string | null,
  audio: Blob,
): Promise<Pendiente> {
  const id = crypto.randomUUID();
  const pendiente: Pendiente = {
    id,
    tipo: 'nota-voz',
    evento_id: eventoId,
    creado_en: new Date().toISOString(),
    payload: { sesion_id: sesionId },
  };
  await put(STORE_PENDIENTES, pendiente);
  await put(STORE_AUDIO, { id, audio });
  return pendiente;
}

export async function encolarContacto(
  eventoId: string,
  payload: ContactoPendientePayload,
): Promise<Pendiente> {
  const pendiente: Pendiente = {
    id: crypto.randomUUID(),
    tipo: 'contacto',
    evento_id: eventoId,
    creado_en: new Date().toISOString(),
    payload,
  };
  await put(STORE_PENDIENTES, pendiente);
  return pendiente;
}

export async function listarPendientes(eventoId: string): Promise<Pendiente[]> {
  const todos = await obtenerTodos<Pendiente>(STORE_PENDIENTES);
  return todos.filter((p) => p.evento_id === eventoId).sort((a, b) => a.creado_en.localeCompare(b.creado_en));
}

export async function cachearAgenda(eventoId: string, agenda: Agenda): Promise<void> {
  await put(STORE_AGENDA, { evento_id: eventoId, agenda });
}

export async function obtenerAgendaCacheada(eventoId: string): Promise<Agenda | null> {
  const registro = await obtener<{ evento_id: string; agenda: Agenda }>(STORE_AGENDA, eventoId);
  return registro?.agenda ?? null;
}

/**
 * Si hay conexión, pide la agenda al backend y la cachea; si no la hay (o falla la petición), cae
 * a la última agenda cacheada con éxito (FR-017). La usan el modo simplificado y la creación de
 * notas/contactos para resolver la sesión activa incluso sin red (research.md R5–R7).
 */
export async function cargarAgenda(eventoId: string): Promise<Agenda> {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('sin-conexion');
    }
    const remota = await api.get<Agenda>(`/events/${eventoId}/agenda`);
    await cachearAgenda(eventoId, remota);
    return remota;
  } catch {
    const cacheada = await obtenerAgendaCacheada(eventoId);
    if (cacheada) return cacheada;
    throw new Error(
      'No se pudo cargar la agenda y no hay ninguna versión guardada para usar sin conexión.',
    );
  }
}

let sincronizando = false;

/**
 * Reenvía la cola de pendientes en orden de creación. Un error de red (`ApiClientError` con
 * `status: 0`, ver api-client.ts) detiene el intento para reintentarlo más tarde; un error de
 * negocio (400/404/422…) descarta ese pendiente concreto sin bloquear el resto de la cola.
 */
export async function sincronizarPendientes(): Promise<void> {
  if (sincronizando) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  sincronizando = true;
  try {
    const pendientes = await obtenerTodos<Pendiente>(STORE_PENDIENTES);
    const ordenados = [...pendientes].sort((a, b) => a.creado_en.localeCompare(b.creado_en));
    for (const p of ordenados) {
      try {
        if (p.tipo === 'nota') {
          await api.post(`/events/${p.evento_id}/notas`, {
            sesion_id: p.payload.sesion_id,
            origen: 'texto',
            contenido: p.payload.contenido,
          });
        } else if (p.tipo === 'nota-voz') {
          const audioRegistro = await obtener<{ id: string; audio: Blob }>(STORE_AUDIO, p.id);
          if (!audioRegistro) {
            await eliminar(STORE_PENDIENTES, p.id);
            continue;
          }
          const audio = await blobABase64(audioRegistro.audio);
          await api.post(`/events/${p.evento_id}/notas`, {
            sesion_id: p.payload.sesion_id,
            origen: 'voz',
            audio,
          });
          await eliminar(STORE_AUDIO, p.id);
        } else {
          await api.post(`/events/${p.evento_id}/contactos`, {
            sesion_id: p.payload.sesion_id,
            nombre: p.payload.nombre,
            nota: p.payload.nota ?? undefined,
          });
        }
        await eliminar(STORE_PENDIENTES, p.id);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 0) break;
        await eliminar(STORE_PENDIENTES, p.id);
      }
    }
  } finally {
    sincronizando = false;
  }
}

/** Sincroniza al cargar la app y cada vez que el navegador recupera la conexión. */
export function iniciarSincronizacionAutomatica(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void sincronizarPendientes();
  });
  void sincronizarPendientes();
}
