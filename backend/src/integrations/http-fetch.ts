/**
 * Obtención de HTML de una URL pública desde el backend (FR-001, FR-002), con protección SSRF
 * (FR-013) y un presupuesto de tiempo compartido con el resto del pipeline (FR-008, research.md
 * R1, R2, R5). El fetch nunca se hace desde el cliente (Principio VI).
 */
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';
import { resolverYValidar } from './ssrf-guard.js';

const MAX_REDIRECTS = 3;

export interface ContenidoHtml {
  html: string;
  urlFinal: string;
}

export interface OpcionesObtenerHtml {
  /** Marca de tiempo (Date.now()) a partir de la cual se considera agotado el presupuesto (research.md R5). */
  deadline: number;
  /** Tamaño máximo de lectura del cuerpo, en bytes (research.md R1). */
  maxBytes: number;
}

/**
 * Crea un `Agent` de undici cuya resolución de nombres está fijada a `ip`: evita que el socket
 * se conecte a una dirección distinta a la ya validada por `resolverYValidar` (DNS rebinding,
 * research.md R2). `servername` mantiene la verificación TLS/SNI contra el hostname real.
 */
function crearDispatcherFijado(ip: string, hostnameOriginal: string): Agent {
  const family = ip.includes(':') ? 6 : 4;
  return new Agent({
    connect: {
      servername: hostnameOriginal,
      // Node usa Happy Eyeballs (RFC 8305) por defecto: net/tls piden la resolución con
      // `options.all` y esperan un array de direcciones, no la forma clásica de un único
      // (address, family). Hay que soportar ambas formas o la conexión falla con
      // ERR_INVALID_IP_ADDRESS: Invalid IP address: undefined.
      lookup: (
        _hostname: string,
        opciones: { all?: boolean } | undefined,
        callback: (
          err: NodeJS.ErrnoException | null,
          addressOrAddresses: string | { address: string; family: number }[],
          family?: number,
        ) => void,
      ) => {
        if (opciones?.all) {
          callback(null, [{ address: ip, family }]);
        } else {
          callback(null, ip, family);
        }
      },
    },
  });
}

async function leerConLimite(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string | null> {
  if (!body) return '';
  const lector = body.getReader();
  const trozos: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await lector.cancel().catch(() => {});
        break;
      }
      trozos.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(trozos.map((t) => Buffer.from(t))).toString('utf-8');
}

/**
 * Obtiene el HTML de `urlInicial`, siguiendo hasta `MAX_REDIRECTS` redirects y revalidando SSRF
 * en cada salto. Devuelve `null` ante cualquier fallo (esquema no soportado, destino privado,
 * error de red, estado no-2xx, o presupuesto de tiempo agotado) — nunca lanza (FR-006).
 */
export async function obtenerHtml(
  urlInicial: string,
  { deadline, maxBytes }: OpcionesObtenerHtml,
): Promise<ContenidoHtml | null> {
  let urlActual = urlInicial;

  for (let salto = 0; salto <= MAX_REDIRECTS; salto++) {
    const restante = deadline - Date.now();
    if (restante <= 0) return null;

    let destino: URL;
    try {
      destino = new URL(urlActual);
    } catch {
      return null;
    }
    if (destino.protocol !== 'http:' && destino.protocol !== 'https:') return null;

    const validado = await resolverYValidar(destino.hostname);
    if (!validado) return null;

    const dispatcher = crearDispatcherFijado(validado.ip, destino.hostname);
    let respuesta: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      respuesta = await undiciFetch(destino, {
        method: 'GET',
        headers: { accept: 'text/html' },
        redirect: 'manual',
        dispatcher: dispatcher as unknown as Dispatcher,
        signal: AbortSignal.timeout(restante),
      });
    } catch {
      return null;
    } finally {
      void dispatcher.close().catch(() => {});
    }

    if (respuesta.status >= 300 && respuesta.status < 400) {
      const ubicacion = respuesta.headers.get('location');
      if (!ubicacion || salto === MAX_REDIRECTS) return null;
      try {
        urlActual = new URL(ubicacion, destino).toString();
      } catch {
        return null;
      }
      continue;
    }

    if (!respuesta.ok) return null;

    const html = await leerConLimite(respuesta.body, maxBytes);
    if (html === null) return null;
    return { html, urlFinal: destino.toString() };
  }

  return null;
}
