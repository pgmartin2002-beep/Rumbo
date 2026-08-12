import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { Agenda, AgendaDiff } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';
import { AgendaDiffCard } from '../components/AgendaDiffCard.js';

export default function AgendaPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useAsync<Agenda>(
    async () => {
      const existente = await api.get<Agenda>(`/events/${id}/agenda`).catch(() => null);
      return existente ?? (await api.post<Agenda>(`/events/${id}/agenda`));
    },
    [id],
  );
  const [diff, setDiff] = useState<AgendaDiff | null>(null);
  const [applying, setApplying] = useState(false);

  if (loading) return <Loading label="Generando tu agenda…" />;
  if (error || !data) return <ErrorState message={error ?? 'No se pudo generar la agenda'} onRetry={reload} />;

  const grupos = {
    imprescindible: data.items.filter((i) => i.prioridad === 'imprescindible'),
    opcional: data.items.filter((i) => i.prioridad === 'opcional'),
    descartable: data.items.filter((i) => i.prioridad === 'descartable'),
  };

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
      <h1>Tu agenda priorizada</h1>

      {diff && (
        <AgendaDiffCard
          diff={diff}
          applying={applying}
          onConfirm={aplicar}
          onDismiss={() => setDiff(null)}
        />
      )}

      {(['imprescindible', 'opcional', 'descartable'] as const).map((prio) => (
        <div key={prio}>
          <h2 style={{ textTransform: 'capitalize' }}>{prio}s</h2>
          {grupos[prio].length === 0 && <p className="state-empty">Sin sesiones.</p>}
          {grupos[prio].map((item) => (
            <article key={item.sesion_id} className={`card priority-${item.prioridad}`}>
              <p>{item.motivo_recomendacion}</p>
              {item.en_conflicto && (
                <p className="badge badge-en_curso">
                  Conflicto de horario{item.es_alternativa_de ? ' · alternativa' : ''}
                </p>
              )}
            </article>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" onClick={pedirRecalculo}>
          Recalcular agenda
        </button>
        <Link to={`/eventos/${id}/logistica`}>
          <button className="btn-primary">Preparar logística</button>
        </Link>
      </div>
    </section>
  );
}
