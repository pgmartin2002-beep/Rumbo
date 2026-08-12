import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api-client.js';
import { OBJETIVOS, type GoalProfile, type Objetivo } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';

export default function Goals() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useAsync<GoalProfile | null>(
    () => api.get<GoalProfile>(`/events/${id}/goals`).catch(() => null),
    [id],
  );
  const [seleccion, setSeleccion] = useState<Objetivo[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (loading) return <Loading label="Cargando objetivos…" />;
  if (error) return <ErrorState message={error} />;

  const actuales = seleccion ?? data?.objetivos ?? [];

  function toggle(o: Objetivo) {
    const base = seleccion ?? data?.objetivos ?? [];
    setSeleccion(base.includes(o) ? base.filter((x) => x !== o) : [...base, o]);
  }

  async function guardar() {
    setSaving(true);
    setAviso(null);
    try {
      const res = await api.put<GoalProfile>(`/events/${id}/goals`, { objetivos: actuales });
      if (res.agenda_recalculo_disponible) {
        setAviso(
          'Tus objetivos cambiaron. La agenda se recalculará cuando lo confirmes en la pantalla de Agenda.',
        );
      } else {
        navigate(`/eventos/${id}/agenda`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="crumb">Objetivos</div>
      <h1 className="screen-title">¿Qué buscas conseguir?</h1>
      <p className="screen-sub">
        Elige una o varias opciones. Puedes cambiarlas antes o durante el evento cuando quieras.
      </p>

      <div className="goal-grid">
        {OBJETIVOS.map((o) => {
          const sel = actuales.includes(o.id);
          return (
            <button
              key={o.id}
              className={`goal-chip ${sel ? 'sel' : ''}`}
              aria-pressed={sel}
              onClick={() => toggle(o.id)}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {aviso && (
        <div className="aviso-recalculo" role="status">
          {aviso}
        </div>
      )}

      <div className="cta-bottom">
        <div className="hint">
          {actuales.length === 0
            ? 'Selecciona al menos un objetivo'
            : `${actuales.length} objetivo${actuales.length > 1 ? 's' : ''} seleccionado${actuales.length > 1 ? 's' : ''}`}
        </div>
        <button className="cta-btn" onClick={guardar} disabled={saving || actuales.length === 0}>
          {saving ? 'Guardando…' : 'Generar mi agenda →'}
        </button>
      </div>
    </section>
  );
}
