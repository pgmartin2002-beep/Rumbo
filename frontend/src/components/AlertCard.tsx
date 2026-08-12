import type { Alert } from '../services/types.js';

/**
 * Tarjeta de alerta logística. Cuando propone una nueva hora de salida, exige confirmación
 * explícita antes de aplicarla (FR-021, FR-022, Principio IV). Sin confirmar, nada cambia.
 */
export function AlertCard({
  alert,
  onConfirm,
  confirming,
}: {
  alert: Alert;
  onConfirm: (alertId: string) => void;
  confirming: boolean;
}) {
  const label: Record<Alert['tipo'], string> = {
    trafico: 'Tráfico detectado',
    retraso: 'Retraso en el transporte',
    cambio_ubicacion: 'Cambio de ubicación',
  };

  return (
    <div className="card state-error" role="alert" style={{ textAlign: 'left' }}>
      <h3>{label[alert.tipo]}</h3>
      {alert.propuesta_hora_salida ? (
        <>
          <p className="ticket-data">
            Nueva hora de salida propuesta: {new Date(alert.propuesta_hora_salida).toLocaleTimeString()}
          </p>
          <button
            className="btn-primary"
            onClick={() => onConfirm(alert.id)}
            disabled={confirming}
          >
            {confirming ? 'Aplicando…' : 'Confirmar nueva hora de salida'}
          </button>
        </>
      ) : (
        <p>Revisa tu plan; puede haber cambios.</p>
      )}
    </div>
  );
}
