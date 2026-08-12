import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { EventDetail } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';

export default function EventReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync<EventDetail>(
    () => api.get(`/events/${id}`),
    [id],
  );
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading label="Cargando evento…" />;
  if (error || !data) return <ErrorState message={error ?? 'Evento no encontrado'} onRetry={reload} />;

  const faltantes: string[] = [];
  if (!data.ubicacion) faltantes.push('ubicación');

  async function guardarUbicacion(valor: string) {
    setSaving(true);
    try {
      await api.patch(`/events/${id}`, { ubicacion: valor });
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h1>{data.nombre}</h1>
      <div className="card">
        <p className="ticket-data">
          {new Date(data.fecha_inicio).toLocaleString()} → {new Date(data.fecha_fin).toLocaleString()}
        </p>
        <p className="ticket-data">Ubicación: {data.ubicacion ?? '—'}</p>

        {faltantes.length > 0 && (
          <div className="state-error" style={{ textAlign: 'left' }}>
            <p>Falta información: {faltantes.join(', ')}. Complétala:</p>
            <input
              placeholder="Añade la ubicación"
              onBlur={(e) => e.target.value && guardarUbicacion(e.target.value)}
              disabled={saving}
            />
          </div>
        )}
      </div>

      <Link to={`/eventos/${id}/objetivos`}>
        <button className="btn-primary">Definir mis objetivos</button>
      </Link>
      <button
        className="btn-secondary"
        style={{ marginLeft: 8 }}
        onClick={() => navigate('/')}
      >
        Volver a mis eventos
      </button>
    </section>
  );
}
