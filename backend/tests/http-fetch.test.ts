import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import { obtenerHtml } from '../src/integrations/http-fetch.js';

/**
 * `resolverYValidar` rechaza 127.0.0.1 por ser una dirección privada (correcto en producción).
 * Para poder probar `obtenerHtml` contra un servidor HTTP real sin salir a red externa, se
 * permite aquí, solo para el hop `127.0.0.1` del propio servidor de test, tratarlo como si fuera
 * público; cualquier otro destino (incluidos los saltos de redirect) sigue pasando por la
 * validación SSRF real — es justo lo que T019 necesita comprobar.
 */
vi.mock('../src/integrations/ssrf-guard.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/integrations/ssrf-guard.js')>();
  return {
    ...real,
    resolverYValidar: vi.fn(async (hostname: string) => {
      if (hostname === '127.0.0.1') {
        return { hostname, ip: '127.0.0.1', family: 4 as const };
      }
      return real.resolverYValidar(hostname);
    }),
  };
});

function levantarServidor(
  handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void,
): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

let servidorActivo: Server | undefined;

afterEach(async () => {
  if (servidorActivo) {
    await new Promise((resolve) => servidorActivo!.close(resolve));
    servidorActivo = undefined;
  }
});

describe('obtenerHtml', () => {
  it('devuelve el HTML y la URL final de una respuesta 200', async () => {
    const { server, url } = await levantarServidor((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><body>Agenda</body></html>');
    });
    servidorActivo = server;

    const resultado = await obtenerHtml(`${url}/agenda`, {
      deadline: Date.now() + 5000,
      maxBytes: 1_000_000,
    });

    expect(resultado).toEqual({ html: '<html><body>Agenda</body></html>', urlFinal: `${url}/agenda` });
  });

  it('sigue un redirect legítimo y devuelve el contenido del destino', async () => {
    const { server, url } = await levantarServidor((req, res) => {
      if (req.url === '/origen') {
        res.writeHead(302, { location: '/destino' });
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<p>Destino</p>');
    });
    servidorActivo = server;

    const resultado = await obtenerHtml(`${url}/origen`, {
      deadline: Date.now() + 5000,
      maxBytes: 1_000_000,
    });

    expect(resultado).toEqual({ html: '<p>Destino</p>', urlFinal: `${url}/destino` });
  });

  it('bloquea un redirect hacia una dirección privada aunque el origen sea válido (FR-013)', async () => {
    const { server, url } = await levantarServidor((_req, res) => {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    });
    servidorActivo = server;

    const resultado = await obtenerHtml(`${url}/origen`, {
      deadline: Date.now() + 5000,
      maxBytes: 1_000_000,
    });

    expect(resultado).toBeNull();
  });

  it('devuelve null ante un estado que no es 2xx ni redirect', async () => {
    const { server, url } = await levantarServidor((_req, res) => {
      res.writeHead(500);
      res.end('error');
    });
    servidorActivo = server;

    const resultado = await obtenerHtml(url, { deadline: Date.now() + 5000, maxBytes: 1_000_000 });

    expect(resultado).toBeNull();
  });

  it('nunca devuelve más contenido del permitido por maxBytes, aunque el cuerpo sea mayor', async () => {
    const { server, url } = await levantarServidor((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      // Varias escrituras para forzar más de un chunk en el stream de lectura.
      for (let i = 0; i < 10; i++) res.write('a'.repeat(100));
      res.end();
    });
    servidorActivo = server;

    const resultado = await obtenerHtml(url, { deadline: Date.now() + 5000, maxBytes: 250 });

    // El corte puede caer antes o justo al límite según el chunking del stream, pero nunca lo supera.
    expect(resultado === null || resultado.html.length <= 250).toBe(true);
  });

  it('devuelve null de inmediato si el presupuesto de tiempo ya se agotó', async () => {
    const resultado = await obtenerHtml('http://127.0.0.1:1/no-deberia-usarse', {
      deadline: Date.now() - 1,
      maxBytes: 1_000_000,
    });

    expect(resultado).toBeNull();
  });

  it('devuelve null para esquemas distintos de http/https', async () => {
    const resultado = await obtenerHtml('ftp://127.0.0.1/archivo', {
      deadline: Date.now() + 5000,
      maxBytes: 1_000_000,
    });

    expect(resultado).toBeNull();
  });
});
