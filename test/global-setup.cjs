require('dotenv/config');
const { spawnSync } = require('node:child_process');
const {
  borrarBd,
  conectarAdmin,
  nombreDeBd,
  nombrePlantilla,
  nombreWorker,
  quoteIdent,
  urlDeBd,
} = require('./e2e-db.cjs');

const prisma = (urlBd, args) => {
  const resultado = spawnSync('pnpm', ['exec', 'prisma', ...args], {
    env: { ...process.env, DATABASE_URL: urlBd },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (resultado.status !== 0) {
    throw new Error(
      `prisma ${args.join(' ')} falló:\n${resultado.stdout}\n${resultado.stderr}`,
    );
  }
};

module.exports = async (globalConfig) => {
  const urlBase = process.env.DATABASE_URL;
  if (!urlBase) {
    throw new Error('DATABASE_URL es obligatoria para correr los e2e');
  }
  // Los workers heredan el entorno: guardamos la URL original para que
  // setup-db-worker.cjs la reescriba sin acumular sufijos entre specs.
  process.env.E2E_DATABASE_URL = urlBase;

  const base = nombreDeBd(urlBase);
  const plantilla = nombrePlantilla(base);
  const workers = Math.max(1, globalConfig.maxWorkers);

  const admin = await conectarAdmin(urlBase);
  try {
    await borrarBd(admin, plantilla);
    await admin.query(`CREATE DATABASE ${quoteIdent(plantilla)}`);
    const urlPlantilla = urlDeBd(urlBase, plantilla);
    prisma(urlPlantilla, ['migrate', 'deploy']);
    prisma(urlPlantilla, ['db', 'seed']);

    for (let i = 1; i <= workers; i++) {
      const nombre = nombreWorker(base, i);
      await borrarBd(admin, nombre);
      await admin.query(
        `CREATE DATABASE ${quoteIdent(nombre)} TEMPLATE ${quoteIdent(plantilla)}`,
      );
    }
  } finally {
    await admin.end();
  }
};
