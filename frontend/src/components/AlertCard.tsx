import type { Alert } from '../services/types.js';

/**
 * Tarjeta de alerta logística. Cuando propone una nueva hora de salida, exige confirmación
 * explícita antes de aplicarla (FR-021, FR-022, Principio IV). Sin confirmar, nada cambia.
 * Usa el lenguaje ámbar de "atención sin ser error", nunca rojo (design.md, componente alert-card).
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
  const titulo: Record<Alert['tipo'], string> = {
    trafico: 'Tráfico detectado',
    retraso: 'Retraso en el transporte',
    cambio_ubicacion: 'Cambio de ubicación',
  };

  const hora = alert.propuesta_hora_salida
    ? new Date(alert.propuesta_hora_salida).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="alert-card" role="alert">
      <div className="txt">
        <b>{titulo[alert.tipo]}</b>
        {hora
          ? `Rumbo propone salir a las ${hora} en lugar de tu hora prevista.`
          : 'Revisa tu plan; puede haber cambios en tu desplazamiento.'}
      </div>
      {hora && (
        <div className="alert-actions">
          <button
            className="alert-btn confirm"
            onClick={() => onConfirm(alert.id)}
            disabled={confirming}
          >
            {confirming ? 'Aplicando…' : 'Confirmar nueva salida'}
          </button>
          <button className="alert-btn keep" disabled={confirming}>
            Mantener la mía
          </button>
        </div>
      )}
      <div className="data-attr">Tráfico en tiempo real: proveedor de mapas</div>
    </div>
  );
}
