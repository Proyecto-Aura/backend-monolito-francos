// Utilidades compartidas por el setup y el teardown de los e2e: una BD por
// worker de Jest, para que los specs que comparten recursos globales (p. ej. el
// único plan estratégico ACTIVO) no choquen cuando corren en paralelo.
const { Client } = require('pg');

const nombreWorker = (base, indice) => `${base}_w${indice}`;
const nombrePlantilla = (base) => `${base}_tpl`;

const urlDeBd = (urlBase, nombreBd) => {
  const url = new URL(urlBase);
  url.pathname = `/${nombreBd}`;
  return url.toString();
};

const nombreDeBd = (urlBase) => new URL(urlBase).pathname.slice(1);

const conectarAdmin = async (urlBase) => {
  const client = new Client({
    connectionString: urlDeBd(urlBase, 'postgres'),
  });
  await client.connect();
  return client;
};

const quoteIdent = (nombre) => `"${nombre.replace(/"/g, '""')}"`;

const borrarBd = (client, nombre) =>
  client.query(`DROP DATABASE IF EXISTS ${quoteIdent(nombre)} WITH (FORCE)`);

module.exports = {
  borrarBd,
  conectarAdmin,
  nombreDeBd,
  nombrePlantilla,
  nombreWorker,
  quoteIdent,
  urlDeBd,
};
