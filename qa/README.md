# QA de Francos

Pruebas que ven el sistema desde fuera: la tienda (`frontend-cliente-angular`)
y el portal de la empresa (`frontend-angular-francos`) en un navegador real,
contra la API de este repo y una base PostgreSQL desechable. En CI las corre
`.github/workflows/qa.yml`; nunca apuntan a AWS.

Esta carpeta es un proyecto **npm** propio, aislado del workspace pnpm del
backend: no entra en el build, el lint, Jest ni la imagen Docker.

## Qué hay

| Ruta | Proyecto | Qué prueba |
| --- | --- | --- |
| `e2e/humo.spec.ts` | `tienda` | Login del cliente de prueba y catálogo con productos. Si falla, el entorno no sirve. |
| `e2e/portal-empresa.spec.ts` | `portal-empresa` | Login del admin y menú de módulos que devuelve la API. |
| `e2e/verificacion-correo.spec.ts` | `tienda` | Flujo de negocio: un cliente se registra, no puede entrar sin verificar (403), abre el enlace del correo capturado por Mailpit y entonces inicia sesión. |

## Correrlo en local

Necesitas cinco cosas arriba: PostgreSQL, Mailpit (SMTP en `:1025` y web en
`:8025`), la API en `:3000`, la tienda en `:4200` y el portal de la empresa en
`:4201`.

0. **Mailpit**, para capturar el correo de verificación:

   ```bash
   docker run -d --name qa-mailpit -p 1025:1025 -p 8025:8025 \
     -e MP_SMTP_AUTH_ACCEPT_ANY=1 -e MP_SMTP_AUTH_ALLOW_INSECURE=1 \
     axllent/mailpit@sha256:9b3a463be15354c0f0eba91697d80e3e0d8a5623ef0e627cacc836bc17fd5231
   ```

   La API debe enviar a ese SMTP: `SMTP_HOST=localhost SMTP_PORT=1025`.

1. **API** (en la raíz del backend), con una base de pruebas y los datos demo:

   ```bash
   SEED_DEMO=true pnpm exec prisma migrate deploy
   SEED_DEMO=true pnpm exec prisma db seed
   CULQI_SIMULADO=true pnpm start:dev
   ```

2. **Tienda** (en `frontend-cliente-angular`, sin modificarla):

   ```bash
   npm ci
   npx ng serve        # configuración development → API en localhost:3000
   ```

3. **Portal de la empresa** (en `frontend-angular-francos`, sin modificarlo):

   ```bash
   npm ci
   npx ng serve --port 4201
   ```

4. **Pruebas** (en esta carpeta):

   ```bash
   npm ci
   npx playwright install chromium
   npm run test:e2e
   npm run report      # abre el reporte HTML con trazas de los fallos
   ```

`QA_TIENDA_URL`, `QA_PORTAL_URL` y `QA_MAILPIT_URL` cambian las URL (por
defecto `http://localhost:4200`, `http://localhost:4201` y
`http://localhost:8025`). Para correr solo un
frontend: `npx playwright test --project=tienda` o `--project=portal-empresa`.

## Usuarios de prueba

Vienen del seed (`prisma/seeds/`): cliente `cliente_prueba` / `cliente123` en
la tienda y `admin` / `admin123` en el portal de la empresa.
Los productos `Chifles (demo) con stock` y `sin stock` se cargan con
`SEED_DEMO=true`.
