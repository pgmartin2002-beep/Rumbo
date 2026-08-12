import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { EventoListado } from '../services/types.js';
import { EmptyState, ErrorState, Loading, useAsync } from '../components/States.js';

function estadoLabel(e: EventoListado['estado_derivado']): string {
  return e === 'en_curso' ? 'En curso' : e === 'proximo' ? 'Próximo' : 'Cerrado';
}

function puntoRetorno(e: EventoListado): string {
  if (e.estado_derivado === 'en_curso') return `/eventos/${e.id}/agenda`;
  if (e.progreso_onboarding === 'agenda_generada') return `/eventos/${e.id}/agenda`;
  if (e.progreso_onboarding === 'objetivos_definidos') return `/eventos/${e.id}/agenda`;
  return `/eventos/${e.id}/objetivos`;
}

export default function MyEvents() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync<EventoListado[]>(() => api.get('/events'));

  if (loading) return <Loading label="Cargando tus eventos…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const eventos = data ?? [];

  if (eventos.length === 0) {
    return (
      <EmptyState>
        <h1>Bienvenido a Rumbo</h1>
        <p>Aún no tienes eventos. Empieza importando tu primer evento.</p>
        <Link to="/importar">
          <button className="btn-primary">Añadir mi primer evento</button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <section>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Mis eventos</h1>
        <Link to="/importar">
          <button className="btn-primary">+ Nuevo</button>
        </Link>
      </header>

      {eventos.map((e) => (
        <article
          key={e.id}
          className="card"
          onClick={() => navigate(puntoRetorno(e))}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2>{e.nombre}</h2>
            <span className={`badge badge-${e.estado_derivado}`}>{estadoLabel(e.estado_derivado)}</span>
          </div>
          <p className="ticket-data">
            {new Date(e.fecha_inicio).toLocaleDateString()} · {e.ubicacion ?? 'Ubicación por confirmar'}
          </p>
          {e.pasos_pendientes.length > 0 && (
            <p className="state-empty" style={{ padding: 8, textAlign: 'left' }}>
              Pendiente: {e.pasos_pendientes.join(', ')}
            </p>
          )}
          {e.estado_derivado === 'en_curso' && (
            <p className="ticket-data">Ahora te toca tu próxima actividad programada.</p>
          )}
        </article>
      ))}
    </section>
  );
}
