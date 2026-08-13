/**
 * Prevención de SSRF (FR-013): sólo se permite conectar a direcciones públicas. Se resuelve el
 * host y se rechaza si *alguna* dirección resuelta es privada/reservada — no basta con encontrar
 * una dirección pública entre varias (research.md R2).
 */
import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';

const RANGOS_PRIVADOS_V4: readonly [base: string, prefijo: number][] = [
  ['0.0.0.0', 8], // "esta" red
  ['10.0.0.0', 8], // RFC1918
  ['100.64.0.0', 10], // CGNAT compartido
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incluye 169.254.169.254 (metadatos de nube)
  ['172.16.0.0', 12], // RFC1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.168.0.0', 16], // RFC1918
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reservado
];

function ipv4AEntero(ip: string): number {
  return ip.split('.').reduce((acc, octeto) => (acc << 8) + Number(octeto), 0) >>> 0;
}

function enRangoV4(ip: string, base: string, prefijo: number): boolean {
  const mascara = prefijo === 0 ? 0 : (0xffffffff << (32 - prefijo)) >>> 0;
  return (ipv4AEntero(ip) & mascara) === (ipv4AEntero(base) & mascara);
}

/** ¿Es `ip` una dirección privada, reservada o no enrutable públicamente? */
export function esIpPrivada(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return RANGOS_PRIVADOS_V4.some(([base, prefijo]) => enRangoV4(ip, base, prefijo));
  }
  if (version === 6) {
    const normalizada = ip.toLowerCase();
    if (normalizada === '::1' || normalizada === '::') return true; // loopback / no especificada
    if (normalizada.startsWith('::ffff:')) {
      const v4 = normalizada.slice('::ffff:'.length);
      return isIP(v4) === 4 ? esIpPrivada(v4) : true;
    }
    const primerGrupo = parseInt(normalizada.split(':')[0] || '0', 16);
    if (primerGrupo >= 0xfe80 && primerGrupo <= 0xfebf) return true; // fe80::/10 link-local
    if (primerGrupo >= 0xfc00 && primerGrupo <= 0xfdff) return true; // fc00::/7 unique local
    return false;
  }
  return true; // no es una IP reconocible → no se puede dar por segura
}

export interface DestinoValidado {
  hostname: string;
  ip: string;
  family: 4 | 6;
}

/**
 * Resuelve `hostname` y devuelve una dirección pública ya validada para fijar la conexión, o
 * `null` si el host es ilegible o alguna de sus direcciones es privada/reservada.
 */
export async function resolverYValidar(hostname: string): Promise<DestinoValidado | null> {
  let direcciones: { address: string; family: number }[];
  try {
    direcciones = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return null;
  }
  if (direcciones.length === 0) return null;
  if (direcciones.some((d) => esIpPrivada(d.address))) return null;
  const elegida = direcciones[0];
  return { hostname, ip: elegida.address, family: elegida.family === 6 ? 6 : 4 };
}
