/**
 * Reduce el HTML obtenido de una URL a texto plano para enviarlo al motor de IA (research.md R4,
 * R11). Heurística simple (sin parsing DOM): combina (a) los bloques `<script>` sin `src` cuyo
 * contenido sea JSON válido — datos que la página ya trae embebidos en el HTML crudo, sin
 * ejecutar JavaScript (FR-014) — con (b) el texto visible tras quitar el resto de etiquetas y
 * decodificar entidades, y recorta el conjunto al límite de caracteres configurado.
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

const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const TIENE_SRC_RE = /\bsrc\s*=/i;
const ES_LD_JSON_RE = /\btype\s*=\s*["']application\/ld\+json["']/i;
const MIN_LONGITUD_CANDIDATO = 30;

/**
 * Busca bloques `<script>` sin `src` cuyo contenido sea JSON válido (research.md R11, FR-014):
 * cubre tanto datos estructurados estándar (`application/ld+json`, p. ej. `schema.org/Event`,
 * que se anteponen al resto) como payloads de hidratación de frameworks SSR que resulten ser un
 * único bloque JSON completo. No cubre formatos de streaming que no son JSON de nivel superior
 * (p. ej. `self.__next_f.push(...)` de Next.js App Router — ver research.md R11) ni ejecuta
 * JavaScript en ningún momento. Nunca lanza.
 */
export function extraerDatosEmbebidos(html: string): string[] {
  const ldJson: string[] = [];
  const otros: string[] = [];
  for (const match of html.matchAll(SCRIPT_TAG_RE)) {
    const atributos = match[1] ?? '';
    if (TIENE_SRC_RE.test(atributos)) continue;
    const contenido = (match[2] ?? '').trim();
    if (contenido.length < MIN_LONGITUD_CANDIDATO) continue;
    if (contenido[0] !== '{' && contenido[0] !== '[') continue;
    try {
      JSON.parse(contenido);
    } catch {
      continue;
    }
    (ES_LD_JSON_RE.test(atributos) ? ldJson : otros).push(contenido);
  }
  return [...ldJson, ...otros];
}

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/gi, (coincidencia) => {
    const clave = `&${coincidencia.slice(1).toLowerCase()}`;
    return ENTIDADES[clave] ?? coincidencia;
  });
}

/** Convierte HTML crudo a texto plano recortado a `maxCaracteres`. Nunca lanza. */
export function htmlATexto(html: string, maxCaracteres: number): string {
  const candidatos = extraerDatosEmbebidos(html);
  const sinScriptsNiEstilos = html.replace(ETIQUETAS_CON_CONTENIDO_DESCARTABLE, ' ');
  const sinEtiquetas = sinScriptsNiEstilos.replace(CUALQUIER_ETIQUETA, ' ');
  const decodificado = decodificarEntidades(sinEtiquetas);
  const textoVisible = decodificado.replace(/\s+/g, ' ').trim();
  const combinado = candidatos.length > 0 ? `${candidatos.join('\n\n')}\n\n${textoVisible}` : textoVisible;
  return combinado.slice(0, Math.max(0, maxCaracteres));
}
