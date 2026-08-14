import { describe, it, expect } from 'vitest';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { GuardiaCapacidadRender } from '../src/integrations/render-capacity.js';
import { LIMITES_INTERACCION } from '../src/integrations/render-config.js';
import { PlaywrightRenderizador } from '../src/integrations/browser-renderer.js';
import { crearProxyEgressSSRF } from '../src/integrations/render-egress-proxy.js';

describe('GuardiaCapacidadRender (T018)', () => {
  it('permite adquirir hasta el máximo y rechaza al saturarse tras la espera', async () => {
    const g = new GuardiaCapacidadRender(1, 40);
    expect(await g.adquirir()).toBe(true);
    const inicio = Date.now();
    expect(await g.adquirir()).toBe(false);
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(30);
  });

  it('cede el hueco a un esperante cuando se libera', async () => {
    const g = new GuardiaCapacidadRender(1, 1000);
    expect(await g.adquirir()).toBe(true);
    const enEspera = g.adquirir();
    setTimeout(() => g.liberar(), 10);
    expect(await enEspera).toBe(true);
  });
});

describe('límites de interacción (T018, FR-006)', () => {
  it('respeta los topes definidos en el plan', () => {
    expect(LIMITES_INTERACCION).toMatchObject({
      consentimiento: 1,
      tabs: 7,
      verMas: 5,
      scroll: 5,
      totalAcciones: 16,
    });
  });
});

describe('PlaywrightRenderizador con fixture dinámica (T013, US1)', () => {
  it('acepta cookies, revela "ver más" y devuelve el DOM renderizado', async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const html = readFileSync(resolve(here, 'fixtures/rendered-agenda/agenda.html'), 'utf-8');
    const fixture = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(html);
    });
    await new Promise<void>((r) => fixture.listen(0, '127.0.0.1', r));
    const dir = fixture.address();
    const port = typeof dir === 'object' && dir ? dir.port : 0;

    // Proxy de prueba: permite solo el loopback de la fixture (producción sigue bloqueando privados).
    const crearProxy = () =>
      crearProxyEgressSSRF({
        validar: async (h) => (h === '127.0.0.1' ? { hostname: h, ip: '127.0.0.1', family: 4 } : null),
        puertosPermitidos: new Set([port]),
      });
    const renderizador = new PlaywrightRenderizador(crearProxy);

    try {
      const res = await renderizador.renderizar(`http://127.0.0.1:${port}/agenda.html`, Date.now() + 30_000);
      expect(res.estado).toBe('completado');
      expect(res.html).toContain('SESION_REVELADA'); // solo aparece tras pulsar "Ver más"
      expect(res.html).not.toContain('Usamos cookies'); // el consentimiento se descartó
    } finally {
      await renderizador.cerrar();
      await new Promise<void>((r) => fixture.close(() => r()));
    }
  }, 60_000);
});
