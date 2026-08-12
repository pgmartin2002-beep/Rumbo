import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', '.e2e-data');

// Arranca cada corrida E2E con el directorio de datos JSON del backend limpio,
// para garantizar el estado de bienvenida (cero eventos) del escenario 6.
export default async function globalSetup(): Promise<void> {
  await rm(dataDir, { recursive: true, force: true });
}
