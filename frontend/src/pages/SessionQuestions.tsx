import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiClientError } from '../services/api-client.js';
import type { Agenda, Pregunta } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function SessionQuestions() {
  const { id, sesionId } = useParams<{ id: string; sesionId: string }>();
  const agenda = useAsync<Agenda>(() => api.get(`/events/${id}/agenda`), [id]);
  const preguntas = useAsync<Pregunta[]>(
    () => api.get(`/events/${id}/sesiones/${sesionId}/preguntas`),
    [id, sesionId],
  );

  const [regenerando, setRegenerando] = useState(false);
  const [infoInsuficiente, setInfoInsuficiente] = useState(false);
  const [servicioNoDisponible, setServicioNoDisponible] = useState(false);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const item = agenda.data?.items.find((it) => it.sesion_id === sesionId) ?? null;

  async function regenerar() {
    setRegenerando(true);
    setInfoInsuficiente(false);
    setServicioNoDisponible(false);
    try {
      await api.post(`/events/${id}/sesiones/${sesionId}/preguntas/generar`);
      preguntas.reload();
    } catch (e) {
      if (e instanceof ApiClientError && e.codigo === 'informacion_insuficiente') {
        setInfoInsuficiente(true);
      } else if (e instanceof ApiClientError && e.codigo === 'servicio_ia_no_disponible') {
        setServicioNoDisponible(true);
      } else {
        throw e;
      }
    } finally {
      setRegenerando(false);
    }
  }

  async function agregarManual() {
    if (!texto.trim()) return;
    setGuardando(true);
    try {
      await api.post(`/events/${id}/sesiones/${sesionId}/preguntas`, { texto });
      setTexto('');
      preguntas.reload();
    } finally {
      setGuardando(false);
    }
  }

  if (agenda.loading || preguntas.loading) return <Loading label="Cargando preguntas…" />;
  if (agenda.error) return <ErrorState message={agenda.error} onRetry={agenda.reload} />;
  if (preguntas.error && !infoInsuficiente && !servicioNoDisponible) {
    return <ErrorState message={preguntas.error} onRetry={preguntas.reload} />;
  }

  const haySugeridas = (preguntas.data ?? []).some((p) => p.origen === 'sugerida');
  const textoBoton = regenerando
    ? haySugeridas
      ? 'Regenerando…'
      : 'Generando…'
    : haySugeridas
      ? 'Regenerar preguntas'
      : 'Generar preguntas';

  return (
    <section>
      <div className="crumb">
        <Link to={`/eventos/${id}/agenda`}>Agenda</Link> · Preguntas
      </div>
      <h1 className="screen-title">{item?.sesion?.titulo ?? 'Sesión'}</h1>
      {item?.sesion && (
        <p className="screen-sub">
          {hora(item.sesion.inicio)} – {hora(item.sesion.fin)}
          {item.sesion.sala ? ` · ${item.sesion.sala}` : ''}
        </p>
      )}

      <button className="btn-secondary" onClick={regenerar} disabled={regenerando}>
        {textoBoton}
      </button>

      {infoInsuficiente && (
        <div className="illegible-card" style={{ marginTop: 14 }}>
          <div className="il-ic">✎</div>
          <div className="il-title">No hay información suficiente</div>
          <div className="il-sub">
            Esta sesión no tiene tema suficiente para sugerir preguntas. Escribe las tuyas abajo.
          </div>
        </div>
      )}

      {servicioNoDisponible && (
        <div className="illegible-card" style={{ marginTop: 14 }}>
          <div className="il-ic">⚠</div>
          <div className="il-title">Servicio de IA no disponible</div>
          <div className="il-sub">
            No se pudieron generar preguntas automáticamente en este momento. Puedes redactar las tuyas a continuación.
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {(preguntas.data ?? []).length === 0 && !infoInsuficiente && !servicioNoDisponible && (
          <p className="state-empty">Todavía no hay preguntas para esta sesión.</p>
        )}
        {(preguntas.data ?? []).map((p) => (
          <div key={p.id} className="pass" style={{ padding: '12px 14px' }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>{p.texto}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
              <span className={`stamp ${p.origen === 'manual' ? 'teal' : 'amber'}`}>
                {p.origen === 'manual' ? 'Tuya' : 'Sugerida'}
              </span>
              {p.tipo && (
                <span className="stamp dim">
                  {p.tipo === 'general' ? 'Estratégica' : 'Técnica'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="divider-line">
        <span>Añadir tu propia pregunta</span>
      </div>
      <textarea
        className="payload-input"
        placeholder="Escribe una pregunta…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
      />
      <button className="cta-btn auto" onClick={agregarManual} disabled={guardando || !texto.trim()}>
        {guardando ? 'Guardando…' : 'Añadir pregunta'}
      </button>
    </section>
  );
}
