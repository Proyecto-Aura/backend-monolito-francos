const { nombreDeBd, nombreWorker, urlDeBd } = require('./e2e-db.cjs');

// Corre en cada worker antes de cargar la app: src/config/envs.ts lee
// DATABASE_URL al importarse, así que cada worker queda atado a su propia BD.
const urlOriginal = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
const indiceWorker = process.env.JEST_WORKER_ID ?? '1';

process.env.DATABASE_URL = urlDeBd(
  urlOriginal,
  nombreWorker(nombreDeBd(urlOriginal), indiceWorker),
);
