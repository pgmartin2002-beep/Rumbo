import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiClientError } from '../services/api-client.js';
import type { Agenda, Nota } from '../services/types.js';
import { sesionIdActual } from '../services/active-session.js';
import {
  blobABase64,
  cargarAgenda,
  encolarNota,
  encolarNotaVoz,
  listarPendientes,
  type Pendiente,
} from '../services/offline-store.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';

function fecha(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Notes() {
  const { id } = useParams<{ id: string }>();
  const agenda = useAsync<Agenda>(() => cargarAgenda(id!), [id]);
  const notas = useAsync<Nota[]>(() => api.get(`/events/${id}/notas`), [id]);
  const pendientes = useAsync<Pendiente[]>(
    async () => (await listarPendientes(id!)).filter((p) => p.tipo === 'nota' || p.tipo === 'nota-voz'),
    [id],
  );

  const [contenido, setContenido] = useState('');
  const [guardandoTexto, setGuardandoTexto] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [procesandoVoz, setProcesandoVoz] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sesionesConDatos = agenda.data?.items.filter((it) => it.sesion !== null) ?? [];
  function tituloSesion(sesionId: string | null): string {
    if (!sesionId) return 'Evento en general';
    return sesionesConDatos.find((it) => it.sesion_id === sesionId)?.sesion?.titulo ?? 'Sesión';
  }

  /**
   * research.md R7: el sesion_id se resuelve en el cliente, nunca lo recalcula el backend.
   * Importante: al quedar offline, solo se recarga `pendientes` (IndexedDB local); recargar
   * `notas` aquí intentaría una petición de red que también fallaría y, al fijar `notas.error`,
   * sustituiría toda la pantalla por el estado de error en vez de mostrar el aviso de "pendiente".
   */
  async function crearNotaTexto() {
    if (!contenido.trim()) return;
    setGuardandoTexto(true);
    const sesionId = sesionIdActual(agenda.data ?? null);
    try {
      try {
        await api.post(`/events/${id}/notas`, { sesion_id: sesionId, origen: 'texto', contenido });
        notas.reload();
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 0) {
          await encolarNota(id!, { sesion_id: sesionId, contenido });
          pendientes.reload();
        } else {
          throw e;
        }
      }
    } finally {
      setContenido('');
      setGuardandoTexto(false);
    }
  }

  async function iniciarGrabacion() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      void procesarNotaVoz(blob);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setGrabando(true);
  }

  function detenerGrabacion() {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  }

  /** Sin conexión, el audio se guarda en local y se transcribe al sincronizar (FR-017, FR-009). */
  async function procesarNotaVoz(blob: Blob) {
    setProcesandoVoz(true);
    const sesionId = sesionIdActual(agenda.data ?? null);
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await encolarNotaVoz(id!, sesionId, blob);
        pendientes.reload();
        return;
      }
      const audio = await blobABase64(blob);
      await api.post(`/events/${id}/notas`, { sesion_id: sesionId, origen: 'voz', audio });
      notas.reload();
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 0) {
        await encolarNotaVoz(id!, sesionId, blob);
        pendientes.reload();
      } else {
        throw e;
      }
    } finally {
      setProcesandoVoz(false);
    }
  }

  async function guardarEdicion(notaId: string) {
    if (!textoEdicion.trim()) return;
    await api.patch(`/events/${id}/notas/${notaId}`, { contenido: textoEdicion });
    setEditandoId(null);
    notas.reload();
  }

  async function eliminarNota(notaId: string) {
    await api.delete(`/events/${id}/notas/${notaId}`);
    notas.reload();
  }

  async function reasignarSesion(notaId: string, nuevaSesionId: string) {
    await api.patch(`/events/${id}/notas/${notaId}`, { sesion_id: nuevaSesionId });
    notas.reload();
  }

  if (notas.loading) return <Loading label="Cargando notas…" />;
  if (notas.error) return <ErrorState message={notas.error} onRetry={notas.reload} />;

  return (
    <section>
      <div className="crumb">
        <Link to={`/eventos/${id}`}>Mi evento</Link> · Notas
      </div>
      <h1 className="screen-title">Tus notas</h1>
      <p className="screen-sub">
        {agenda.data
          ? `Se vincularán a: ${tituloSesion(sesionIdActual(agenda.data))}`
          : 'Sin agenda disponible: se vincularán al evento en general'}
      </p>

      <textarea
        className="payload-input"
        placeholder="Escribe una nota…"
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        rows={3}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className="btn-primary"
          onClick={crearNotaTexto}
          disabled={guardandoTexto || !contenido.trim()}
        >
          {guardandoTexto ? 'Guardando…' : 'Guardar nota'}
        </button>
        <button
          className="btn-secondary"
          onClick={grabando ? detenerGrabacion : iniciarGrabacion}
          disabled={procesandoVoz}
        >
          {grabando ? '⏹ Detener grabación' : procesandoVoz ? 'Procesando…' : '🎙 Nota de voz'}
        </button>
      </div>

      {(pendientes.data ?? []).length > 0 && (
        <div className="gap-warning">
          {pendientes.data!.length} nota(s) pendiente(s) de sincronizar en cuanto haya conexión.
        </div>
      )}

      {(notas.data ?? []).length === 0 && <p className="state-empty">Todavía no tienes notas.</p>}

      {(notas.data ?? []).map((n) => (
        <div key={n.id} className="pass" style={{ padding: 12 }}>
          <div className="pass-time">
            {fecha(n.creado_en)} · {tituloSesion(n.sesion_id)}
          </div>
          {editandoId === n.id ? (
            <>
              <textarea
                className="payload-input"
                value={textoEdicion}
                onChange={(e) => setTextoEdicion(e.target.value)}
                rows={2}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={() => guardarEdicion(n.id)}>
                  Guardar
                </button>
                <button className="btn-secondary" onClick={() => setEditandoId(null)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '6px 0', fontSize: 13.5 }}>
                {n.estado_transcripcion === 'pendiente'
                  ? 'No se pudo transcribir el audio. Escribe aquí lo que dijiste.'
                  : n.contenido}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditandoId(n.id);
                    setTextoEdicion(n.estado_transcripcion === 'pendiente' ? '' : n.contenido);
                  }}
                >
                  Editar
                </button>
                <button className="btn-secondary" onClick={() => eliminarNota(n.id)}>
                  Eliminar
                </button>
                {n.sesion_id === null && sesionesConDatos.length > 0 && (
                  <select
                    className="origin-input"
                    style={{ marginBottom: 0, width: 'auto' }}
                    defaultValue=""
                    onChange={(e) => e.target.value && reasignarSesion(n.id, e.target.value)}
                  >
                    <option value="" disabled>
                      Vincular a sesión…
                    </option>
                    {sesionesConDatos.map((s) => (
                      <option key={s.sesion_id} value={s.sesion_id}>
                        {s.sesion?.titulo}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
