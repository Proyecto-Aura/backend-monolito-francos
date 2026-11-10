import { defineConfig, devices } from '@playwright/test';

// La tienda (frontend-cliente-angular), el portal de la empresa
// (frontend-angular-francos) y la API corren en el mismo runner, levantados por
// .github/actions/qa-entorno. En local, se levantan a mano (ver qa/README.md).
// Nunca apunta a AWS.
const TIENDA_URL = process.env.QA_TIENDA_URL ?? 'http://localhost:4200';
const PORTAL_URL = process.env.QA_PORTAL_URL ?? 'http://localhost:4201';
const enCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: enCI,
  // Un reintento en CI para que el reporte distinga "flaky" de "roto", pero una
  // prueba flaky deja el job en rojo: no se esconde con un reintento.
  retries: enCI ? 1 : 0,
  failOnFlakyTests: enCI,
  workers: enCI ? 2 : undefined,
  reporter: enCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Un proyecto por frontend: cada uno corre sus pruebas contra su URL.
  projects: [
    {
      name: 'tienda',
      testMatch: 'humo.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: TIENDA_URL },
    },
    {
      name: 'portal-empresa',
      testMatch: 'portal-empresa.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: PORTAL_URL },
    },
  ],
});
