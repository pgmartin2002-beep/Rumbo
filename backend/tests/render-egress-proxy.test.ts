import { describe, it, expect, vi } from 'vitest';
import http from 'node:http';
import type net from 'node:net';
import { validarDestinoProxy, crearProxyEgressSSRF } from '../src/integrations/render-egress-proxy.js';
import type { DestinoValidado } from '../src/integrations/ssrf-guard.js';

const publico: DestinoValidado = { hostname: 'publico.test', ip: '93.184.216.34', family: 4 };
const validarFake = async (h: string): Promise<DestinoValidado | null> =>
  h === 'publico.test' ? publico : null;

describe('validarDestinoProxy (T017)', () => {
  it('rechaza puertos fuera de 80/443', async () => {
    expect(await validarDestinoProxy('publico.test', 22, validarFake)).toBeNull();
    expect(await validarDestinoProxy('publico.test', 3306, validarFake)).toBeNull();
  });

  it('rechaza destinos no públicos aunque el puerto sea válido', async () => {
    expect(await validarDestinoProxy('interno.test', 443, validarFake)).toBeNull();
    expect(await validarDestinoProxy('', 443, validarFake)).toBeNull();
  });

  it('acepta un destino público en puerto permitido', async () => {
    expect(await validarDestinoProxy('publico.test', 443, validarFake)).toEqual(publico);
  });
});

function socketFalso(): net.Socket {
  const s: Record<string, unknown> = {};
  s.on = vi.fn(() => s);
  s.pipe = vi.fn();
  s.write = vi.fn();
  s.destroy = vi.fn();
  s.end = vi.fn();
  return s as unknown as net.Socket;
}

function peticionConnect(port: number, target: string): Promise<void> {
  return new Promise((resolve) => {
    let resuelto = false;
    const req = http.request({ host: '127.0.0.1', port, method: 'CONNECT', path: target });
    const fin = (): void => {
      if (resuelto) return;
      resuelto = true;
      req.destroy();
      resolve();
    };
    req.on('connect', (_res, socket) => {
      socket.destroy();
      fin();
    });
    req.on('error', fin);
    req.end();
    setTimeout(fin, 300);
  });
}

describe('proxy egress CONNECT no alcanza destinos denegados (T017, FR-007)', () => {
  it('no abre socket upstream para un destino interno/privado', async () => {
    const conectar = vi.fn(() => socketFalso());
    const proxy = await crearProxyEgressSSRF({ validar: validarFake, conectar });
    try {
      await peticionConnect(proxy.puerto(), 'interno.test:443');
      expect(conectar).not.toHaveBeenCalled();
      expect(proxy.solicitudesBloqueadas).toBeGreaterThan(0);
    } finally {
      await proxy.cerrar();
    }
  });

  it('abre el socket upstream contra la IP validada para un destino público', async () => {
    const conectar = vi.fn(() => socketFalso());
    const proxy = await crearProxyEgressSSRF({ validar: validarFake, conectar });
    try {
      await peticionConnect(proxy.puerto(), 'publico.test:443');
      expect(conectar).toHaveBeenCalledWith('93.184.216.34', 443);
    } finally {
      await proxy.cerrar();
    }
  }, 15_000);
});
