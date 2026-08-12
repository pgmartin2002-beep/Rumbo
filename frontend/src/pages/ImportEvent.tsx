import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiClientError } from '../services/api-client.js';
import type { EventDraft } from '../services/types.js';

const FUENTES: { id: string; label: string }[] = [
  { id: 'url', label: 'URL de la web' },
  { id: 'pdf', label: 'PDF de la agenda' },
  { id: 'imagen', label: 'Imagen' },
  { id: 'calendario', label: 'Invitación de calendario' },
  { id: 'correo', label: 'Correo electrónico' },
  { id: 'qr', label: 'Código QR' },
  { id: 'buscador', label: 'Buscar en la app' },
];

export default function ImportEvent() {
  const navigate = useNavigate();
  const [fuente, setFuente] = useState('url');
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [illegible, setIllegible] = useState(false);

  async function importar() {
    setLoading(true);
    setError(null);
    setIllegible(false);
    try {
      const draft = await api.post<EventDraft>('/events/import', { fuente, payload });
      navigate(`/eventos/${draft.id}`);
    } catch (e) {
      if (e instanceof ApiClientError && e.codigo === 'fuente_ilegible') {
        setIllegible(true);
      } else {
        setError(e instanceof ApiClientError ? e.message : 'Error inesperado');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h1>Importar evento</h1>
      <div className="card">
        <label>
          Fuente
          <select value={fuente} onChange={(ev) => setFuente(ev.target.value)}>
            {FUENTES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <textarea
          placeholder="Pega aquí la URL, el texto o los datos de la fuente"
          value={payload}
          onChange={(ev) => setPayload(ev.target.value)}
          rows={5}
          style={{ width: '100%', marginTop: 12 }}
        />
        <button className="btn-primary" onClick={importar} disabled={loading}>
          {loading ? 'Importando…' : 'Importar'}
        </button>
      </div>

      {illegible && (
        <div className="card state-error" role="alert">
          <p>No hemos podido extraer datos de esa fuente.</p>
          <button className="btn-secondary" onClick={() => setIllegible(false)}>
            Probar con otra fuente
          </button>
        </div>
      )}
      {error && <div className="card state-error">{error}</div>}
    </section>
  );
}
