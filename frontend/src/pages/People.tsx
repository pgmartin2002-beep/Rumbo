import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiClientError } from '../services/api-client.js';
import type { Agenda, Contacto, ContactoConDuplicados } from '../services/types.js';
import { sesionIdActual } from '../services/active-session.js';
import { cargarAgenda, encolarContacto, listarPendientes, type Pendiente } from '../services/offline-store.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';
import { DuplicateContactModal } from '../components/DuplicateContactModal.js';

export default function People() {
  const { id } = useParams<{ id: string }>();
  const agenda = useAsync<Agenda>(() => cargarAgenda(id!), [id]);
  const contactos = useAsync<Contacto[]>(() => api.get(`/events/${id}/contactos`), [id]);
  const pendientes = useAsync<Pendiente[]>(
    async () => (await listarPendientes(id!)).filter((p) => p.tipo === 'contacto'),
    [id],
  );

  const [nombre, setNombre] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [duplicadoInfo, setDuplicadoInfo] = useState<ContactoConDuplicados | null>(null);
  const [fusionando, setFusionando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [notaEdicion, setNotaEdicion] = useState('');

  const sesionesConDatos = agenda.data?.items.filter((it) => it.sesion !== null) ?? [];
  function tituloSesion(sesionId: string | null): string {
    if (!sesionId) return 'Evento en general';
    return sesionesConDatos.find((it) => it.sesion_id === sesionId)?.sesion?.titulo ?? 'Sesión';
  }

  /**
   * research.md R7: el sesion_id se resuelve en el cliente, nunca lo recalcula el backend.
   * Importante: al quedar offline, solo se recarga `pendientes` (IndexedDB local); recargar
   * `contactos` aquí intentaría una petición de red que también fallaría y, al fijar
   * `contactos.error`, sustituiría toda la pantalla por el estado de error en vez de mostrar el
   * aviso de "pendiente".
   */
  async function registrarContacto() {
    if (!nombre.trim()) return;
    setGuardando(true);
    const sesionId = sesionIdActual(agenda.data ?? null);
    try {
      try {
        const resultado = await api.post<ContactoConDuplicados>(`/events/${id}/contactos`, {
          sesion_id: sesionId,
          nombre,
          nota: nota.trim() || undefined,
        });
        if (resultado.posibles_duplicados.length > 0) {
          setDuplicadoInfo(resultado);
        }
        contactos.reload();
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 0) {
          await encolarContacto(id!, { sesion_id: sesionId, nombre, nota: nota.trim() || null });
          pendientes.reload();
        } else {
          throw e;
        }
      }
    } finally {
      setNombre('');
      setNota('');
      setGuardando(false);
    }
  }

  /** Fusiona el contacto ya existente (destino, se conserva) con el recién creado (origen). */
  async function fusionar(duplicadoId: string) {
    if (!duplicadoInfo) return;
    setFusionando(true);
    try {
      await api.post(`/events/${id}/contactos/${duplicadoId}/fusionar`, {
        con_id: duplicadoInfo.contacto.id,
      });
      setDuplicadoInfo(null);
      contactos.reload();
    } finally {
      setFusionando(false);
    }
  }

  async function guardarEdicionNota(contactoId: string) {
    await api.patch(`/events/${id}/contactos/${contactoId}`, { nota: notaEdicion });
    setEditandoId(null);
    contactos.reload();
  }

  if (contactos.loading) return <Loading label="Cargando personas…" />;
  if (contactos.error) return <ErrorState message={contactos.error} onRetry={contactos.reload} />;

  return (
    <section>
      <div className="crumb">
        <Link to={`/eventos/${id}`}>Mi evento</Link> · Personas
      </div>
      <h1 className="screen-title">Personas que conoces</h1>
      <p className="screen-sub">
        {agenda.data
          ? `Se vincularán a: ${tituloSesion(sesionIdActual(agenda.data))}`
          : 'Sin agenda disponible: se vincularán al evento en general'}
      </p>

      <input
        className="origin-input"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <textarea
        className="payload-input"
        placeholder="Nota rápida (opcional)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={2}
      />
      <button
        className="btn-primary"
        onClick={registrarContacto}
        disabled={guardando || !nombre.trim()}
      >
        {guardando ? 'Guardando…' : 'Registrar contacto'}
      </button>

      {duplicadoInfo && (
        <div style={{ marginTop: 16 }}>
          <DuplicateContactModal
            contacto={duplicadoInfo.contacto}
            duplicados={duplicadoInfo.posibles_duplicados}
            onFusionar={fusionar}
            onDescartar={() => setDuplicadoInfo(null)}
            fusionando={fusionando}
          />
        </div>
      )}

      {(pendientes.data ?? []).length > 0 && (
        <div className="gap-warning" style={{ marginTop: 16 }}>
          {pendientes.data!.length} contacto(s) pendiente(s) de sincronizar en cuanto haya conexión.
        </div>
      )}

      {(contactos.data ?? []).length === 0 && (
        <p className="state-empty">Todavía no has registrado a nadie.</p>
      )}

      {(contactos.data ?? []).map((c) => (
        <div key={c.id} className="pass" style={{ padding: 12, marginTop: 12 }}>
          <div className="pass-name">{c.nombre}</div>
          <div className="pass-room">{tituloSesion(c.sesion_id)}</div>
          {editandoId === c.id ? (
            <>
              <textarea
                className="payload-input"
                value={notaEdicion}
                onChange={(e) => setNotaEdicion(e.target.value)}
                rows={2}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={() => guardarEdicionNota(c.id)}>
                  Guardar
                </button>
                <button className="btn-secondary" onClick={() => setEditandoId(null)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '6px 0', fontSize: 13.5 }}>{c.nota ?? 'Sin nota todavía.'}</p>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditandoId(c.id);
                  setNotaEdicion(c.nota ?? '');
                }}
              >
                Editar nota
              </button>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
