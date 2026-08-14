import 'dotenv/config';
import { createRequire } from 'node:module';
import { buildApp } from './app.js';

// Node no hereda las CA del almacén de Windows; tras una inspección SSL corporativa (MITM) las
// llamadas HTTPS del backend (motor de IA, obtención de páginas) fallarían con
// SELF_SIGNED_CERT_IN_CHAIN. `win-ca` inyecta esas CA en el trust de Node. No-op fuera de Windows.
if (process.platform === 'win32') {
  try {
    createRequire(import.meta.url)('win-ca')({ inject: '+' });
  } catch {
    /* si win-ca no está disponible, se mantiene el trust por defecto de Node */
  }
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const app = buildApp({ logger: true });

app
  .listen({ port, host })
  .then((address) => {
    app.log.info(`Rumbo BFF escuchando en ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
