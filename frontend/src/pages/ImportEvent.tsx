import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiClientError } from '../services/api-client.js';
import type { EventDraft } from '../services/types.js';

const FUENTES: { id: string; label: string; icon: string }[] = [
  { id: 'url', label: 'Enlace de la web del evento', icon: '🔗' },
  { id: 'pdf', label: 'PDF o imagen de la agenda', icon: '📄' },
  { id: 'calendario', label: 'Invitación de calendario o email', icon: '📅' },
  { id: 'qr', label: 'Escanear código QR', icon: '▦' },
  { id: 'buscador', label: 'Buscar evento por nombre', icon: '🔍' },
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
      <div className="crumb">Nuevo evento</div>
      <h1 className="screen-title">Trae tu evento, como lo tengas a mano.</h1>
      <p className="screen-sub">
        Pega un enlace, sube un PDF, escanea un QR o búscalo. Rumbo se encarga de sacar fechas,
        sesiones y ponentes.
      </p>

      {FUENTES.slice(0, 4).map((f) => (
        <button
          key={f.id}
          className={`import-row ${fuente === f.id ? 'sel' : ''}`}
          onClick={() => setFuente(f.id)}
        >
          <div className="ico">{f.icon}</div>
          <div className="lbl">{f.label}</div>
          <div className="chev">›</div>
        </button>
      ))}

      <div className="divider-line">
        <span>o busca</span>
      </div>
      <button
        className={`import-row ${fuente === 'buscador' ? 'sel' : ''}`}
        onClick={() => setFuente('buscador')}
      >
        <div className="ico">🔍</div>
        <div className="lbl">Buscar evento por nombre</div>
        <div className="chev">›</div>
      </button>

      <textarea
        className="payload-input"
        placeholder="Pega aquí la URL, el texto o los datos de la fuente"
        value={payload}
        onChange={(ev) => setPayload(ev.target.value)}
        rows={4}
      />

      <button className="cta-btn" onClick={importar} disabled={loading}>
        {loading ? 'Importando…' : 'Importar evento →'}
      </button>

      {illegible && (
        <div className="illegible-card" role="alert">
          <div className="il-ic">⚠️</div>
          <div className="il-title">No hemos podido extraer datos de esta fuente</div>
          <div className="il-sub">
            La imagen o el enlace no parecen corresponder a un evento, o la calidad no permite
            extraer datos. Prueba con otra fuente o introdúcelo a mano.
          </div>
          <div className="il-actions">
            <button className="il-btn primary" onClick={() => setIllegible(false)}>
              Probar con otra fuente
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="state-error" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}
    </section>
  );
}
