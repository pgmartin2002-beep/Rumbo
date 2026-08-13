import type { Contacto } from '../services/types.js';

/**
 * Tras registrar un contacto con posibles duplicados (FR-016), deja elegir entre fusionar con uno
 * de ellos o guardarlo como una persona distinta. Nunca fusiona sin esta confirmación explícita
 * (Principio IV), igual que AgendaDiffCard con el recálculo de agenda.
 */
export function DuplicateContactModal({
  contacto,
  duplicados,
  onFusionar,
  onDescartar,
  fusionando,
}: {
  contacto: Contacto;
  duplicados: { id: string; nombre: string }[];
  onFusionar: (duplicadoId: string) => void;
  onDescartar: () => void;
  fusionando: boolean;
}) {
  return (
    <div className="agenda-diff-card" role="dialog" aria-label="Posible contacto duplicado">
      <div className="diff-title">¿Es la misma persona?</div>
      <p className="diff-sub">
        "{contacto.nombre}" se parece a{' '}
        {duplicados.length > 1 ? 'estos contactos que ya tienes' : 'un contacto que ya tienes'}.
        Puedes fusionarlos o guardarlo como alguien distinto.
      </p>
      {duplicados.map((d) => (
        <div key={d.id} className="diff-row">
          <span className="name">{d.nombre}</span>
          <button
            className="diff-btn apply"
            style={{ flex: 'unset', padding: '6px 14px' }}
            onClick={() => onFusionar(d.id)}
            disabled={fusionando}
          >
            {fusionando ? 'Fusionando…' : 'Fusionar'}
          </button>
        </div>
      ))}
      <div className="diff-actions">
        <button className="diff-btn keep" onClick={onDescartar} disabled={fusionando}>
          Guardar como distinto
        </button>
      </div>
    </div>
  );
}
