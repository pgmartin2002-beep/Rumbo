import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Agenda } from '../services/types.js';
import { sesionActiva } from '../services/active-session.js';
import { cargarAgenda } from '../services/offline-store.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function SimplifiedMode() {
  const { id } = useParams<{ id: string }>();
  const agenda = useAsync<Agenda>(() => cargarAgenda(id!), [id]);
  const [ahora, setAhora] = useState(() => new Date());

  // FR-006: se actualiza sola, sin que el usuario tenga que refrescar nada.
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(intervalo);
  }, []);

  if (agenda.loading) return <Loading label="Cargando modo simplificado…" />;
  if (agenda.error || !agenda.data) {
    return <ErrorState message={agenda.error ?? 'No se pudo cargar la agenda'} onRetry={agenda.reload} />;
  }

  const estado = sesionActiva(agenda.data, ahora);

  return (
    <section>
      <div className="crumb">
        <Link to={`/eventos/${id}`}>Mi evento</Link> · Ahora
      </div>
      <h1 className="screen-title">Modo simplificado</h1>
      <p className="screen-sub">Lo único que necesitas saber: qué toca ahora y dónde es.</p>

      {estado.estado === 'sesion_activa' && (
        <div className="pass">
          <div className="pass-top">
            <div className="pass-time">Ahora mismo</div>
            <div className="pass-name">{estado.item.sesion?.titulo ?? 'Sesión'}</div>
            <div className="pass-room">{estado.item.sesion?.sala ?? 'Sala sin asignar'}</div>
          </div>
        </div>
      )}

      {estado.estado === 'hueco' && (
        <div className="state-empty">
          <p>No tienes nada agendado ahora mismo.</p>
          {estado.proxima?.sesion && (
            <p>
              Próxima actividad: <b>{estado.proxima.sesion.titulo}</b> a las{' '}
              {hora(estado.proxima.sesion.inicio)}
            </p>
          )}
        </div>
      )}

      {estado.estado === 'no_activo' && (
        <div className="state-empty">
          <p>El evento no está activo en este momento.</p>
          {estado.posicion === 'antes' && estado.primera?.sesion && (
            <p>
              Primera actividad: <b>{estado.primera.sesion.titulo}</b> a las{' '}
              {hora(estado.primera.sesion.inicio)}
            </p>
          )}
          {estado.posicion === 'despues' && estado.ultima?.sesion && (
            <p>
              Última actividad: <b>{estado.ultima.sesion.titulo}</b> a las{' '}
              {hora(estado.ultima.sesion.inicio)}
            </p>
          )}
        </div>
      )}

      <div className="cta-bottom">
        <Link to={`/eventos/${id}/notas`} style={{ textDecoration: 'none' }}>
          <button className="btn-secondary" style={{ width: '100%', marginBottom: 8 }}>
            Tomar una nota
          </button>
        </Link>
        <Link to={`/eventos/${id}/personas`} style={{ textDecoration: 'none' }}>
          <button className="btn-secondary" style={{ width: '100%' }}>
            Registrar un contacto
          </button>
        </Link>
      </div>
    </section>
  );
}
