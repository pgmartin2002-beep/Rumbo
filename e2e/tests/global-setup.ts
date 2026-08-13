import { limpiarDatosE2E } from './reset-data.js';

// Arranca cada corrida E2E con el directorio de datos JSON del backend limpio,
// para garantizar el estado de bienvenida (cero eventos) del escenario 6.
export default async function globalSetup(): Promise<void> {
  await limpiarDatosE2E();
}
