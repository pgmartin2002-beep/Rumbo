/**
 * Reduce el HTML obtenido de una URL a texto plano para enviarlo al motor de IA (research.md R4).
 * Heurística simple (sin parsing DOM): quita scripts/estilos, el resto de etiquetas, decodifica
 * entidades comunes y recorta al límite de caracteres configurado, priorizando el inicio del
 * documento.
 */
const ETIQUETAS_CON_CONTENIDO_DESCARTABLE = /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi;
const CUALQUIER_ETIQUETA = /<[^>]+>/g;
const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/gi, (coincidencia) => {
    const clave = `&${coincidencia.slice(1).toLowerCase()}`;
    return ENTIDADES[clave] ?? coincidencia;
  });
}

/** Convierte HTML crudo a texto plano recortado a `maxCaracteres`. Nunca lanza. */
export function htmlATexto(html: string, maxCaracteres: number): string {
  const sinScriptsNiEstilos = html.replace(ETIQUETAS_CON_CONTENIDO_DESCARTABLE, ' ');
  const sinEtiquetas = sinScriptsNiEstilos.replace(CUALQUIER_ETIQUETA, ' ');
  const decodificado = decodificarEntidades(sinEtiquetas);
  const colapsado = decodificado.replace(/\s+/g, ' ').trim();
  return colapsado.slice(0, Math.max(0, maxCaracteres));
}
