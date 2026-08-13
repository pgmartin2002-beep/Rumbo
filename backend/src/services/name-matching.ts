/**
 * Coincidencia aproximada de nombres para detectar contactos posiblemente duplicados (FR-016,
 * research.md R4). Normaliza (acentos/mayúsculas/espacios), ordena los tokens (para que "Juan
 * Pérez" y "Pérez Juan" comparen igual) y mide la distancia de Levenshtein entre ambas cadenas.
 * Sin dependencias externas.
 */
export function normalizar(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokensOrdenados(nombre: string): string {
  return normalizar(nombre).split(' ').filter(Boolean).sort().join(' ');
}

export function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + coste);
    }
  }
  return dp[m][n];
}

/** Tolera erratas y variaciones menores; umbral proporcional a la longitud del nombre más largo. */
export function esPosibleDuplicado(nombreA: string, nombreB: string): boolean {
  const a = tokensOrdenados(nombreA);
  const b = tokensOrdenados(nombreB);
  if (!a || !b) return false;
  if (a === b) return true;
  const distancia = distanciaLevenshtein(a, b);
  const umbral = Math.max(1, Math.round(0.2 * Math.max(a.length, b.length)));
  return distancia <= umbral;
}
