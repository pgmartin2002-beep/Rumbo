import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { EventDetail } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync<EventDetail>(() => api.get(`/events/${id}`), [id]);
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading label="Cargando evento…" />;
  if (error || !data) return <ErrorState message={error ?? 'Evento no encontrado'} onRetry={reload} />;

  async function guardarUbicacion(valor: string) {
    setSaving(true);
    try {
      await api.patch(`/events/${id}`, { ubicacion: valor });
      reload();
    } finally {
      setSaving(false);
    }
  }

  const faltaUbicacion = !data.ubicacion;

  return (
    <section>
      <div className="crumb">Nuevo evento · vista previa</div>
      <h1 className="screen-title">{data.nombre}</h1>
      <p className="screen-sub">Revisa los datos extraídos y completa lo que falte antes de seguir.</p>

      <div className="preview-card">
        <div className="ev-name">{data.nombre}</div>
        <div className="field-row">
          <span className="k">Fechas</span>
          <span className="v">
            {fechaLarga(data.fecha_inicio)} → {fechaLarga(data.fecha_fin)}
          </span>
        </div>
        <div className="field-row">
          <span className="k">Ubicación</span>
          {data.ubicacion ? (
            <span className="v">{data.ubicacion}</span>
          ) : (
            <span className="v missing">Falta esta información</span>
          )}
        </div>

        {faltaUbicacion && (
          <input
            className="fix-input"
            placeholder="Añade la ubicación a mano"
            onBlur={(e) => e.target.value && guardarUbicacion(e.target.value)}
            disabled={saving}
          />
        )}
      </div>

      <div className="cta-bottom">
        <Link to={`/eventos/${id}/objetivos`} style={{ textDecoration: 'none' }}>
          <button className="cta-btn">Definir mis objetivos →</button>
        </Link>
        <button
          className="btn-secondary"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => navigate('/')}
        >
          Volver a mis eventos
        </button>
      </div>
    </section>
  );
}
