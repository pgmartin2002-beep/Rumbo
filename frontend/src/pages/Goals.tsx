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
        setAviso('Tus objetivos cambiaron. La agenda se recalculará cuando lo confirmes en la pantalla de Agenda.');
      } else {
        navigate(`/eventos/${id}/agenda`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h1>¿Qué buscas conseguir?</h1>
      <p>Elige uno o varios objetivos. Adaptaremos tu agenda a ellos.</p>
      <div className="card">
        {OBJETIVOS.map((o) => (
          <label key={o.id} style={{ display: 'block', padding: '8px 0' }}>
            <input
              type="checkbox"
              checked={actuales.includes(o.id)}
              onChange={() => toggle(o.id)}
            />{' '}
            {o.label}
          </label>
        ))}
      </div>
      {aviso && <div className="card" role="status">{aviso}</div>}
      <button className="btn-primary" onClick={guardar} disabled={saving || actuales.length === 0}>
        {saving ? 'Guardando…' : 'Guardar objetivos'}
      </button>
    </section>
  );
}
