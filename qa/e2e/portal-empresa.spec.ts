import { expect, test } from '@playwright/test';

// Prueba de humo del portal de la empresa (frontend-angular-francos). Usa el
// admin del seed (prisma/seeds/admin.seed.ts). El módulo "Configuración" solo
// aparece cuando la API devuelve el menú del admin (/rutas/mi-menu): no está en
// las tarjetas que el portal muestra mientras espera la respuesta.
const ADMIN = { usuario: 'admin', password: 'admin123' };

test.describe('humo: login del portal de la empresa', () => {
  test('el admin inicia sesión y ve sus módulos desde la API', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await expect(
      page.getByRole('heading', { name: 'Iniciar Sesion' }),
    ).toBeVisible();

    await page.getByLabel('Usuario', { exact: true }).fill(ADMIN.usuario);
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password);

    const login = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/login') &&
        r.request().method() === 'POST',
    );
    const menu = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/rutas/mi-menu') &&
        r.request().method() === 'GET',
    );
    await page.getByRole('button', { name: 'Iniciar Sesion' }).click();
    expect((await login).status()).toBeLessThan(300);

    await expect(page).toHaveURL(/\/home/);
    expect((await menu).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Módulos del sistema' }),
    ).toBeVisible();
    await expect(
      page.getByText('Configuración', { exact: true }),
    ).toBeVisible();
  });

  test('una contraseña incorrecta muestra el error y no entra', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Usuario', { exact: true }).fill(ADMIN.usuario);
    await page
      .getByLabel('Contraseña', { exact: true })
      .fill('contraseña-incorrecta');

    // Se exige el 401 real de la API y su mensaje: un error de red o de CORS
    // muestra otro texto ("No se pudo iniciar sesión") y no debe dar verde.
    const login = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/login') &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Iniciar Sesion' }).click();
    expect((await login).status()).toBe(401);

    await expect(page.getByText('Credenciales inválidas')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
