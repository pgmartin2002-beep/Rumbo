import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { Agenda, AgendaDiff, AgendaItem, PrioridadAgenda } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';
import { AgendaDiffCard } from '../components/AgendaDiffCard.js';

const STAMP: Record<PrioridadAgenda, string> = {
  imprescindible: 'amber',
  opcional: 'teal',
  descartable: 'plum',
};
const STAMP_LABEL: Record<PrioridadAgenda, string> = {
  imprescindible: 'Imprescindible',
  opcional: 'Opcional',
  descartable: 'Descartable',
};

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function franja(item: AgendaItem): string {
  if (!item.sesion) return '';
  const sala = item.sesion.sala ? ` · ${item.sesion.sala}` : '';
  return `${hora(item.sesion.inicio)} – ${hora(item.sesion.fin)}${sala}`;
}

export default function AgendaPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useAsync<Agenda>(async () => {
    const existente = await api.get<Agenda>(`/events/${id}/agenda`).catch(() => null);
    return existente ?? (await api.post<Agenda>(`/events/${id}/agenda`));
  }, [id]);
  const [diff, setDiff] = useState<AgendaDiff | null>(null);
  const [applying, setApplying] = useState(false);

  if (loading) return <Loading label="Generando tu agenda…" />;
  if (error || !data)
    return <ErrorState message={error ?? 'No se pudo generar la agenda'} onRetry={reload} />;

  async function pedirRecalculo() {
    const d = await api.get<AgendaDiff>(`/events/${id}/agenda/recalculo`);
    setDiff(d);
  }

  async function aplicar() {
    setApplying(true);
    try {
      await api.post<Agenda>(`/events/${id}/agenda/aplicar`);
      setDiff(null);
      reload();
    } finally {
      setApplying(false);
    }
  }

  return (
    <section>
      <div className="crumb">Agenda priorizada</div>
      <h1 className="screen-title">Tu agenda priorizada</h1>
      <p className="screen-sub">
        Ordenada por hora. El sello te dice de un vistazo a qué merece la pena ir.
      </p>

      <button className="diff-trigger" onClick={pedirRecalculo}>
        ¿Cambiaste tus objetivos? → ver agenda recalculada
      </button>

      {diff && (
        <AgendaDiffCard
          diff={diff}
          applying={applying}
          onConfirm={aplicar}
          onDismiss={() => setDiff(null)}
        />
      )}

      {data.items.length === 0 && <p className="state-empty">Sin sesiones priorizables todavía.</p>}

      {data.items.map((item) => (
        <div key={item.sesion_id}>
          <Link
            to={`/eventos/${id}/agenda/${item.sesion_id}`}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <div className={`pass ${item.prioridad === 'descartable' ? '' : ''}`}>
              <div className="pass-top">
                <div className="pass-time">{franja(item)}</div>
                <div className="pass-name">{item.sesion?.titulo ?? 'Sesión'}</div>
                {item.sesion?.ponentes.length ? (
                  <div className="pass-room">{item.sesion.ponentes.join(', ')}</div>
                ) : (
                  <div className="pass-room">Sin ponente asignado</div>
                )}
              </div>
              <div className="perf" />
              <div className="pass-bottom">
                <span
                  className={`stamp ${STAMP[item.prioridad]}${item.prioridad === 'descartable' ? ' dim' : ''}`}
                >
                  {STAMP_LABEL[item.prioridad]}
                </span>
                <span className="pass-reason">{item.motivo_recomendacion}</span>
              </div>
            </div>
          </Link>
          {item.en_conflicto && item.es_alternativa_de && (
            <div className="conflict-note">
              Conflicto de horario: esta sesión queda como alternativa de otra que se solapa en tu
              agenda.
            </div>
          )}
        </div>
      ))}

      <div className="cta-bottom">
        <Link to={`/eventos/${id}/logistica`} style={{ textDecoration: 'none' }}>
          <button className="cta-btn">Preparar logística →</button>
        </Link>
      </div>
    </section>
  );
}
