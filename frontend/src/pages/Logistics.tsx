import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { Alert, MedioTransporte, RouteResult } from '../services/types.js';
import { useAsync } from '../components/States.js';
import { AlertCard } from '../components/AlertCard.js';

const MEDIOS: { id: MedioTransporte; label: string }[] = [
  { id: 'publico', label: 'Transporte público' },
  { id: 'coche', label: 'Coche' },
  { id: 'a_pie', label: 'Andando' },
];

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function Logistics() {
  const { id } = useParams<{ id: string }>();
  const [origen, setOrigen] = useState('');
  const [medio, setMedio] = useState<MedioTransporte>('publico');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const alerts = useAsync<Alert[]>(() => api.get(`/events/${id}/alerts`), [id]);

  async function calcular() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<RouteResult>(`/events/${id}/route`, { origen, medio });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function confirmar(alertId: string) {
    setConfirming(true);
    try {
      await api.post(`/events/${id}/route/confirmar`, { alerta_id: alertId });
      alerts.reload();
      calcular();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <section>
      <div className="crumb">Logística · hora de salida</div>
      <h1 className="screen-title">Tu ruta al evento</h1>
      <p className="screen-sub">Una sola cifra importa: la hora de salida. El resto es apoyo.</p>

      <input
        className="origin-input"
        placeholder="Punto de origen (casa, hotel, oficina…)"
        value={origen}
        onChange={(e) => setOrigen(e.target.value)}
      />

      <div className="segmented">
        {MEDIOS.map((m) => (
          <button
            key={m.id}
            className={`seg ${medio === m.id ? 'on' : ''}`}
            onClick={() => setMedio(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <button className="cta-btn" onClick={calcular} disabled={loading || !origen}>
        {loading ? 'Calculando…' : 'Calcular ruta'}
      </button>

      {error && (
        <div className="state-error" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="route-card" style={{ marginTop: 16 }}>
            <div className="route-line">
              {result.ruta.origen} <span className="arrow">→</span> {result.ruta.destino}
            </div>
            <div className="route-sub">{result.ruta.duracion_estimada} min de trayecto</div>
            <div className="data-attr">Rutas y tráfico: proveedor de mapas</div>
          </div>

          {result.parking.length > 0 && (
            <div className="parking-card">
              <div className="pk-title">Aparcamiento cercano</div>
              {result.parking.map((p) => (
                <div key={p.nombre} className="pk-row">
                  <div className="pk-name">{p.nombre}</div>
                  <div className="pk-dist">{p.distancia_min} min a pie</div>
                </div>
              ))}
            </div>
          )}

          <div className="depart-block">
            <div className="depart-time">{hora(result.ruta.hora_salida_recomendada)}</div>
            <div className="depart-sub">Hora de salida recomendada</div>
            <div className="route-sub" style={{ marginTop: 6 }}>
              {result.ruta.duracion_estimada} min de trayecto + margen
            </div>
          </div>

          {result.avisos_desplazamiento.length > 0 && (
            <div className="gap-warning">
              ⚠️ {result.avisos_desplazamiento.join(' · ')}
            </div>
          )}
        </>
      )}

      {!alerts.loading &&
        (alerts.data ?? []).map((a) => (
          <AlertCard key={a.id} alert={a} onConfirm={confirmar} confirming={confirming} />
        ))}
    </section>
  );
}
