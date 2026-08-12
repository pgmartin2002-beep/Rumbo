import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api-client.js';
import type { Alert, MedioTransporte, RouteResult } from '../services/types.js';
import { ErrorState, Loading, useAsync } from '../components/States.js';
import { AlertCard } from '../components/AlertCard.js';

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
      <h1>Logística</h1>
      <div className="card">
        <input
          placeholder="Punto de origen (casa, hotel, oficina…)"
          value={origen}
          onChange={(e) => setOrigen(e.target.value)}
          style={{ width: '100%' }}
        />
        <label style={{ display: 'block', marginTop: 12 }}>
          Transporte
          <select value={medio} onChange={(e) => setMedio(e.target.value as MedioTransporte)}>
            <option value="publico">Público</option>
            <option value="coche">Coche</option>
            <option value="a_pie">A pie</option>
          </select>
        </label>
        <button className="btn-primary" onClick={calcular} disabled={loading || !origen}>
          {loading ? 'Calculando…' : 'Calcular ruta'}
        </button>
      </div>

      {error && <div className="card state-error">{error}</div>}

      {result && (
        <div className="card">
          <p className="ticket-data">
            Hora de salida: {new Date(result.ruta.hora_salida_recomendada).toLocaleTimeString()}
          </p>
          <p className="ticket-data">Duración estimada: {result.ruta.duracion_estimada} min</p>
          <h3>Opciones de transporte</h3>
          <ul>
            {result.opciones_transporte.map((o) => (
              <li key={o.medio} className="ticket-data">
                {o.descripcion} — {o.duracion_min} min
              </li>
            ))}
          </ul>
          {result.parking.length > 0 && (
            <>
              <h3>Aparcamiento</h3>
              <ul>
                {result.parking.map((p) => (
                  <li key={p.nombre} className="ticket-data">
                    {p.nombre} — {p.distancia_min} min
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.avisos_desplazamiento.length > 0 && (
            <div className="state-error" style={{ textAlign: 'left' }}>
              {result.avisos_desplazamiento.map((a, i) => (
                <p key={i}>⚠️ {a}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {!alerts.loading &&
        (alerts.data ?? []).map((a) => (
          <AlertCard key={a.id} alert={a} onConfirm={confirmar} confirming={confirming} />
        ))}
    </section>
  );
}
