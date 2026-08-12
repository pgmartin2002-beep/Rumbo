import type { AgendaDiff } from '../services/types.js';

/**
 * Tarjeta de propuesta de recálculo de agenda. Muestra el diff y exige confirmación explícita
 * antes de aplicar (FR-015, Principio IV: la app propone, el usuario confirma).
 */
export function AgendaDiffCard({
  diff,
  onConfirm,
  onDismiss,
  applying,
}: {
  diff: AgendaDiff;
  onConfirm: () => void;
  onDismiss: () => void;
  applying: boolean;
}) {
  const sinCambios =
    diff.suben.length + diff.bajan.length + diff.entran.length + diff.salen.length === 0;

  return (
    <div className="card" role="dialog" aria-label="Propuesta de recálculo de agenda">
      <h3>Propuesta de nueva agenda</h3>
      {sinCambios ? (
        <p>No hay cambios respecto a tu agenda actual.</p>
      ) : (
        <ul className="ticket-data">
          {diff.entran.length > 0 && <li>Entran: {diff.entran.length} sesión(es)</li>}
          {diff.suben.length > 0 && <li>Suben de prioridad: {diff.suben.length}</li>}
          {diff.bajan.length > 0 && <li>Bajan de prioridad: {diff.bajan.length}</li>}
          {diff.salen.length > 0 && <li>Salen: {diff.salen.length}</li>}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={onConfirm} disabled={applying || sinCambios}>
          {applying ? 'Aplicando…' : 'Confirmar y aplicar'}
        </button>
        <button className="btn-secondary" onClick={onDismiss} disabled={applying}>
          Descartar
        </button>
      </div>
    </div>
  );
}
