import { expect, test } from '@playwright/test';

// Prueba de humo: si esto falla, el entorno no sirve y no tiene sentido correr
// el resto. Usa el cliente de prueba del seed
// (prisma/seeds/usuario-prueba-cliente.seed.ts) y los productos demo que se
// cargan con SEED_DEMO=true (prisma/seeds/demo-stock-productos.seed.ts).
const CLIENTE = { usuario: 'cliente_prueba', password: 'cliente123' };

test.describe('humo: login y catálogo de la tienda', () => {
  test('el cliente inicia sesión y ve el catálogo con productos', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await expect(
      page.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeVisible();

    await page.locator('input[autocomplete="username"]').fill(CLIENTE.usuario);
    await page
      .locator('input[autocomplete="current-password"]')
      .fill(CLIENTE.password);

    const login = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/login') &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    expect((await login).status()).toBeLessThan(300);

    await expect(page).toHaveURL(/\/catalogo/);
    await expect(
      page.getByRole('heading', { name: 'Snacks naturales del Perú' }),
    ).toBeVisible();
    // El producto demo con stock viene del seed: prueba que la tienda leyó
    // el catálogo real de la API, no una pantalla vacía.
    await expect(
      page.getByRole('heading', { name: 'Chifles (demo) con stock' }),
    ).toBeVisible();
  });

  test('una contraseña incorrecta muestra el error y no entra', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await page.locator('input[autocomplete="username"]').fill(CLIENTE.usuario);
    await page
      .locator('input[autocomplete="current-password"]')
      .fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
