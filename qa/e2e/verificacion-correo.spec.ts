import { expect, test, type APIRequestContext } from '@playwright/test';

// Flujo de negocio de la tienda: un cliente nuevo se registra, no puede entrar
// hasta verificar su correo, abre el enlace que le llega y entonces sí entra.
// El correo lo captura Mailpit, que corre en el runner: nunca sale a internet.
const MAILPIT_URL = process.env.QA_MAILPIT_URL ?? 'http://localhost:8025';

interface MailpitBusqueda {
  messages: { ID: string }[];
}

interface MailpitMensaje {
  Subject: string;
  HTML: string;
}

// Datos únicos por corrida: la prueba también puede repetirse sobre una base
// que ya tenga clientes de corridas anteriores.
function clienteNuevo() {
  const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    dni: sufijo.slice(-8),
    email: `qa.verificacion.${sufijo}@francos.test`,
    username: `qa_verif_${sufijo}`,
    password: 'Clave-Segura-2026',
  };
}

// Espera a que llegue el correo de verificación y devuelve el enlace que trae.
async function enlaceDeVerificacion(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  let id = '';
  await expect
    .poll(
      async () => {
        const r = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        const { messages } = (await r.json()) as MailpitBusqueda;
        id = messages[0]?.ID ?? '';
        return id;
      },
      {
        message: `no llegó el correo de verificación a ${email}`,
        timeout: 15_000,
      },
    )
    .not.toBe('');

  const r = await request.get(`${MAILPIT_URL}/api/v1/message/${id}`);
  const mensaje = (await r.json()) as MailpitMensaje;
  expect(mensaje.Subject).toContain('Verifica tu correo');

  const enlace = /href="([^"]*\/verify-email\?token=[^"]+)"/.exec(
    mensaje.HTML,
  )?.[1];
  expect(enlace, 'el correo no trae el enlace de verificación').toBeTruthy();
  return enlace!;
}

test.describe('flujo: registro y verificación de correo en la tienda', () => {
  test('un cliente nuevo verifica su correo desde el enlace y recién entonces inicia sesión', async ({
    page,
    request,
  }) => {
    // Seis pasos con dos logins, un registro y un correo: el límite general de
    // 30 s (pensado para las pruebas de humo) se queda corto.
    test.setTimeout(90_000);
    const cliente = clienteNuevo();

    // 1. Registro: documento.
    await page.goto('/auth/registro/documento');
    await page.locator('select[formcontrolname="tipo"]').selectOption('dni');
    await page.getByLabel('Número de documento').fill(cliente.dni);
    await page.getByRole('button', { name: 'Siguiente' }).click();

    // 2. Registro: datos personales.
    await expect(page).toHaveURL(/\/auth\/registro\/datos/);
    await page.getByLabel('Nombres', { exact: true }).fill('Cliente QA');
    await page
      .getByLabel('Apellido paterno', { exact: true })
      .fill('Verificación');
    await page.getByLabel('Apellido materno', { exact: true }).fill('Correo');
    await page.getByLabel('Teléfono', { exact: true }).fill('987654321');
    await page
      .getByLabel('Fecha de nacimiento', { exact: true })
      .fill('1995-05-10');
    await page.getByLabel('Dirección', { exact: true }).fill('Av. Pruebas 123');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // 3. Registro: usuario. Se exige el 201 real de la API.
    await page
      .getByLabel('Email de acceso', { exact: true })
      .fill(cliente.email);
    await page.getByLabel('Username', { exact: true }).fill(cliente.username);
    await page.getByLabel('Contraseña', { exact: true }).fill(cliente.password);
    const registro = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/register') &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    expect((await registro).status()).toBe(201);
    await expect(page).toHaveURL(/\/auth\/login\?registrado=1/);

    // 4. Sin verificar, la API rechaza el login (403) y la tienda no entra.
    await page.locator('input[autocomplete="username"]').fill(cliente.username);
    await page
      .locator('input[autocomplete="current-password"]')
      .fill(cliente.password);
    const loginBloqueado = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/login') &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    expect((await loginBloqueado).status()).toBe(403);
    await expect(page.getByRole('alert')).toContainText('verificar tu correo');
    await expect(page).toHaveURL(/\/auth\/login/);

    // 5. El enlace del correo verifica la cuenta.
    const enlace = await enlaceDeVerificacion(request, cliente.email);
    const verificacion = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/verify-email') &&
        r.request().method() === 'POST',
    );
    await page.goto(enlace);
    expect((await verificacion).status()).toBeLessThan(300);
    await expect(
      page.getByRole('link', { name: 'Ir a iniciar sesión' }),
    ).toBeVisible();

    // 6. Ya verificado, el mismo cliente entra y llega al catálogo.
    await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click();
    await page.locator('input[autocomplete="username"]').fill(cliente.username);
    await page
      .locator('input[autocomplete="current-password"]')
      .fill(cliente.password);
    const login = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/auth/login') &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    expect((await login).status()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/catalogo/);
  });
});
