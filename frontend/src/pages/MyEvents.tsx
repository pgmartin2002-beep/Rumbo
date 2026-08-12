import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { EventoListado } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';

const PASOS = [
  { key: 'importado', label: 'Evento importado' },
  { key: 'objetivos_definidos', label: 'Definir objetivos' },
  { key: 'agenda_generada', label: 'Generar agenda' },
] as const;

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function estadoTexto(e: EventoListado): string {
  if (e.estado_derivado === 'en_curso') return 'En curso · hoy';
  if (e.estado_derivado === 'proximo') return 'Próximo';
  return 'Cerrado';
}

function puntoRetorno(e: EventoListado): string {
  if (e.estado_derivado === 'en_curso') return `/eventos/${e.id}/agenda`;
  if (e.progreso_onboarding === 'agenda_generada') return `/eventos/${e.id}/agenda`;
  if (e.progreso_onboarding === 'objetivos_definidos') return `/eventos/${e.id}/agenda`;
  return `/eventos/${e.id}/objetivos`;
}

function pasoCompletado(e: EventoListado, key: string): boolean {
  const orden = ['importado', 'objetivos_definidos', 'agenda_generada'];
  return orden.indexOf(e.progreso_onboarding) >= orden.indexOf(key);
}

export default function MyEvents() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync<EventoListado[]>(() => api.get('/events'));

  if (loading) return <Loading label="Cargando tus eventos…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const eventos = data ?? [];

  if (eventos.length === 0) {
    return (
      <section>
        <div className="crumb">Hola</div>
        <div className="home-empty">
          <div className="he-ic">✦</div>
          <h1 className="he-title">Bienvenido a Rumbo</h1>
          <div className="he-sub">
            Aún no tienes eventos. Trae el primero desde una URL, un PDF, un QR o buscándolo, y Rumbo
            se encarga de lo demás.
          </div>
          <Link to="/importar">
            <button className="cta-btn auto">Añadir mi primer evento →</button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="crumb">Hola</div>
      <h1 className="screen-title">Tus eventos</h1>
      <p className="screen-sub">Cada evento guarda su propia agenda, objetivos y contactos.</p>

      <Link to="/importar" style={{ textDecoration: 'none' }}>
        <button className="home-add">
          <div className="ha-ic">+</div>
          <div>
            <div className="ha-t">Trae tu próximo evento</div>
            <div className="ha-s">URL, PDF, QR, calendario o búsqueda</div>
          </div>
        </button>
      </Link>

      {eventos.map((e) => {
        const enCurso = e.estado_derivado === 'en_curso';
        const completo = e.progreso_onboarding === 'agenda_generada';
        const statusClass =
          e.estado_derivado === 'proximo'
            ? 'upcoming'
            : e.estado_derivado === 'cerrado'
              ? 'closed'
              : '';
        return (
          <button key={e.id} className="event-pass" onClick={() => navigate(puntoRetorno(e))}>
            <div className="ep-top">
              <div className={`ep-status-row ${statusClass}`}>
                {enCurso && <span className="ep-live-dot" />}
                <span className="ep-status">{estadoTexto(e)}</span>
              </div>
              <h2 className="ep-name">{e.nombre}</h2>
              <div className="ep-meta">
                {fechaCorta(e.fecha_inicio)} · {e.ubicacion ?? 'Ubicación por confirmar'}
              </div>
            </div>
            <div className="perf" />
            <div className="ep-bottom">
              {completo ? (
                <div className="ep-summary">
                  Onboarding completo · <b>toca tu próxima actividad programada</b>
                </div>
              ) : (
                <div className="ep-checklist">
                  {PASOS.map((p) => {
                    const done = pasoCompletado(e, p.key);
                    return (
                      <div key={p.key} className={`ep-check-row ${done ? 'done' : 'pending'}`}>
                        <div className="cdot">{done ? '✓' : ''}</div>
                        <span>{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </section>
  );
}
