/**
 * Proxy de salida SSRF-safe para el navegador de render (feature 004, research.md R3). Chromium se
 * lanza con este proxy como única salida: cada petición HTTP y cada `CONNECT` HTTPS se valida
 * resolviendo el host y fijando la conexión a la IP pública validada (mismo criterio que
 * `http-fetch.ts`), de modo que ni el documento, ni los redirects, ni los subrecursos pueden
 * alcanzar destinos internos/privados/de metadatos de nube aunque el JavaScript de la página lo
 * intente. Escucha solo en loopback.
 */
import http from 'node:http';
import net from 'node:net';
import { resolverYValidar, type DestinoValidado } from './ssrf-guard.js';

const PUERTOS_PERMITIDOS_DEFECTO = new Set([80, 443]);

/** Valida (host, puerto) para el proxy: puerto permitido y todas las IPs resueltas públicas. */
export async function validarDestinoProxy(
  hostname: string,
  puerto: number,
  validar: (host: string) => Promise<DestinoValidado | null> = resolverYValidar,
  puertos: Set<number> = PUERTOS_PERMITIDOS_DEFECTO,
): Promise<DestinoValidado | null> {
  if (!puertos.has(puerto)) return null;
  if (!hostname) return null;
  return validar(hostname);
}

export interface OpcionesProxyEgress {
  /** Resolución/validación de destino; inyectable para pruebas (por defecto `resolverYValidar`). */
  validar?: (host: string) => Promise<DestinoValidado | null>;
  /** Apertura del socket upstream a la IP ya validada; inyectable para pruebas. */
  conectar?: (ip: string, puerto: number) => net.Socket;
  /** Puertos permitidos; por defecto solo 80/443. Ampliable solo en pruebas (fixtures en loopback). */
  puertosPermitidos?: Set<number>;
}

export interface ProxyEgress {
  puerto(): number;
  cerrar(): Promise<void>;
  /** Nº de peticiones/CONNECT rechazados por política (observabilidad, sin URLs sensibles). */
  solicitudesBloqueadas: number;
}

function conectarPorDefecto(ip: string, puerto: number): net.Socket {
  return net.connect(puerto, ip);
}

/**
 * Arranca el proxy en un puerto efímero de loopback. Devuelve control del ciclo de vida y el
 * contador de solicitudes bloqueadas. Nunca abre un socket upstream a un destino denegado.
 */
export async function crearProxyEgressSSRF(opciones: OpcionesProxyEgress = {}): Promise<ProxyEgress> {
  const validar = opciones.validar ?? resolverYValidar;
  const conectar = opciones.conectar ?? conectarPorDefecto;
  const puertos = opciones.puertosPermitidos ?? PUERTOS_PERMITIDOS_DEFECTO;
  const estado = { bloqueadas: 0 };

  const server = http.createServer((req, res) => {
    void manejarHttp(req, res, validar, conectar, estado, puertos);
  });

  server.on('connect', (req, clientSocket) => {
    void manejarConnect(req, clientSocket as net.Socket, validar, conectar, estado, puertos);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const direccion = server.address();
  const puerto = typeof direccion === 'object' && direccion ? direccion.port : 0;

  return {
    puerto: () => puerto,
    cerrar: () =>
      new Promise<void>((resolve) => {
        let hecho = false;
        const fin = (): void => {
          if (hecho) return;
          hecho = true;
          resolve();
        };
        server.close(() => fin());
        server.closeAllConnections?.();
        setTimeout(fin, 500).unref?.();
      }),
    get solicitudesBloqueadas() {
      return estado.bloqueadas;
    },
  };
}

async function manejarHttp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  validar: (host: string) => Promise<DestinoValidado | null>,
  conectar: (ip: string, puerto: number) => net.Socket,
  estado: { bloqueadas: number },
  puertos: Set<number>,
): Promise<void> {
  let destino: URL;
  try {
    destino = new URL(req.url ?? '');
  } catch {
    estado.bloqueadas++;
    res.writeHead(400).end();
    return;
  }
  if (destino.protocol !== 'http:') {
    estado.bloqueadas++;
    res.writeHead(403).end();
    return;
  }
  const puerto = destino.port ? Number(destino.port) : 80;
  const validado = await validarDestinoProxy(destino.hostname, puerto, validar, puertos);
  if (!validado) {
    estado.bloqueadas++;
    res.writeHead(403).end();
    return;
  }
  const ruta = destino.pathname + destino.search;
  const upstream = http.request(
    { host: validado.ip, port: puerto, method: req.method, path: ruta, headers: req.headers },
    (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers);
      upRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
}

async function manejarConnect(
  req: http.IncomingMessage,
  clientSocket: net.Socket,
  validar: (host: string) => Promise<DestinoValidado | null>,
  conectar: (ip: string, puerto: number) => net.Socket,
  estado: { bloqueadas: number },
  puertos: Set<number>,
): Promise<void> {
  const [host, puertoBruto] = (req.url ?? '').split(':');
  const puerto = Number(puertoBruto);
  const validado = await validarDestinoProxy(host, puerto, validar, puertos);
  if (!validado) {
    estado.bloqueadas++;
    clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    clientSocket.destroy();
    return;
  }
  // Túnel TCP ciego a la IP validada; el cliente hace su propio TLS/SNI contra el host original.
  const upstream = conectar(validado.ip, puerto);
  upstream.on('connect', () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });
  upstream.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => upstream.destroy());
}
