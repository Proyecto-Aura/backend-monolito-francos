const {
  borrarBd,
  conectarAdmin,
  nombreDeBd,
  nombrePlantilla,
  nombreWorker,
} = require('./e2e-db.cjs');

module.exports = async (globalConfig) => {
  const urlBase = process.env.E2E_DATABASE_URL;
  if (!urlBase) return;

  const base = nombreDeBd(urlBase);
  const workers = Math.max(1, globalConfig.maxWorkers);

  const admin = await conectarAdmin(urlBase);
  try {
    for (let i = 1; i <= workers; i++) {
      await borrarBd(admin, nombreWorker(base, i));
    }
    await borrarBd(admin, nombrePlantilla(base));
  } finally {
    await admin.end();
  }
};
