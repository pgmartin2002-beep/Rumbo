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
  const total = diff.suben.length + diff.bajan.length + diff.entran.length + diff.salen.length;
  const sinCambios = total === 0;

  return (
    <div className="agenda-diff-card" role="dialog" aria-label="Propuesta de recálculo de agenda">
      <div className="diff-title">Nueva agenda disponible</div>
      {sinCambios ? (
        <p className="diff-sub">No hay cambios respecto a tu agenda actual.</p>
      ) : (
        <>
          <p className="diff-sub">
            Cambiaron tus objetivos. Esto afecta a {total} sesión{total > 1 ? 'es' : ''} — revísalo
            antes de sustituir tu agenda actual.
          </p>
          {diff.entran.length > 0 && (
            <div className="diff-row">
              <span className="name">Nuevas sesiones recomendadas</span>
              <span className="diff-tag new">Entran {diff.entran.length}</span>
            </div>
          )}
          {diff.suben.length > 0 && (
            <div className="diff-row">
              <span className="name">Suben de prioridad</span>
              <span className="diff-tag up">Suben {diff.suben.length}</span>
            </div>
          )}
          {diff.bajan.length > 0 && (
            <div className="diff-row">
              <span className="name">Bajan de prioridad</span>
              <span className="diff-tag down">Bajan {diff.bajan.length}</span>
            </div>
          )}
          {diff.salen.length > 0 && (
            <div className="diff-row">
              <span className="name">Dejan de recomendarse</span>
              <span className="diff-tag out">Salen {diff.salen.length}</span>
            </div>
          )}
        </>
      )}
      <div className="diff-actions">
        <button className="diff-btn apply" onClick={onConfirm} disabled={applying || sinCambios}>
          {applying ? 'Aplicando…' : 'Aplicar nueva agenda'}
        </button>
        <button className="diff-btn keep" onClick={onDismiss} disabled={applying}>
          Mantener la actual
        </button>
      </div>
    </div>
  );
}
