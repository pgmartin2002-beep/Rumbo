import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as dnsPromises } from 'node:dns';
import { esIpPrivada, resolverYValidar } from '../src/integrations/ssrf-guard.js';

vi.mock('node:dns', () => ({
  promises: { lookup: vi.fn() },
}));

describe('esIpPrivada', () => {
  it('no marca como privadas direcciones IPv4 públicas', () => {
    expect(esIpPrivada('8.8.8.8')).toBe(false);
    expect(esIpPrivada('93.184.216.34')).toBe(false);
  });

  it('reconoce los rangos privados RFC1918', () => {
    expect(esIpPrivada('10.0.0.1')).toBe(true);
    expect(esIpPrivada('172.16.5.4')).toBe(true);
    expect(esIpPrivada('172.31.255.254')).toBe(true);
    expect(esIpPrivada('192.168.1.1')).toBe(true);
  });

  it('reconoce loopback y el endpoint de metadatos de nube (link-local)', () => {
    expect(esIpPrivada('127.0.0.1')).toBe(true);
    expect(esIpPrivada('169.254.169.254')).toBe(true);
  });

  it('reconoce IPv6 loopback, link-local y unique-local como privadas', () => {
    expect(esIpPrivada('::1')).toBe(true);
    expect(esIpPrivada('fe80::1')).toBe(true);
    expect(esIpPrivada('fc00::1')).toBe(true);
    expect(esIpPrivada('fd12:3456:789a::1')).toBe(true);
  });

  it('reconoce una dirección IPv4-mapped privada como privada', () => {
    expect(esIpPrivada('::ffff:127.0.0.1')).toBe(true);
  });

  it('no marca como privada una dirección IPv6 pública', () => {
    expect(esIpPrivada('2001:4860:4860::8888')).toBe(false);
  });
});

describe('resolverYValidar', () => {
  beforeEach(() => {
    vi.mocked(dnsPromises.lookup).mockReset();
  });

  it('devuelve la dirección validada cuando todas las direcciones resueltas son públicas', async () => {
    vi.mocked(dnsPromises.lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ] as never);

    const resultado = await resolverYValidar('ejemplo.com');

    expect(resultado).toEqual({ hostname: 'ejemplo.com', ip: '93.184.216.34', family: 4 });
  });

  it('rechaza el host si alguna dirección resuelta es privada (defensa frente a DNS rebinding)', async () => {
    vi.mocked(dnsPromises.lookup).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ] as never);

    const resultado = await resolverYValidar('rebinding.invalid');

    expect(resultado).toBeNull();
  });

  it('devuelve null si la resolución DNS falla', async () => {
    vi.mocked(dnsPromises.lookup).mockRejectedValue(new Error('ENOTFOUND'));

    const resultado = await resolverYValidar('no-existe.invalid');

    expect(resultado).toBeNull();
  });

  it('devuelve null si el host no resuelve a ninguna dirección', async () => {
    vi.mocked(dnsPromises.lookup).mockResolvedValue([] as never);

    const resultado = await resolverYValidar('sin-direcciones.invalid');

    expect(resultado).toBeNull();
  });
});
