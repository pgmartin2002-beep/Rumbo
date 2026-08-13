import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', '.e2e-data');

/**
 * Deja el directorio de datos JSON del backend vacío. Se usa tanto en `global-setup.ts` (una vez
 * al arrancar toda la suite) como en el `beforeAll` de cada spec file, para que cada archivo
 * empiece desde cero sin importar en qué orden se ejecuten los distintos `*.spec.ts`.
 */
export async function limpiarDatosE2E(): Promise<void> {
  await rm(dataDir, { recursive: true, force: true });
}
