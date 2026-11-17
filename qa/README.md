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

## Correrlo en local

Necesitas cuatro cosas arriba: PostgreSQL, la API en `:3000`, la tienda en
`:4200` y el portal de la empresa en `:4201`.

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

`QA_TIENDA_URL` y `QA_PORTAL_URL` cambian las URL (por defecto
`http://localhost:4200` y `http://localhost:4201`). Para correr solo un
frontend: `npx playwright test --project=tienda` o `--project=portal-empresa`.

## Usuarios de prueba

Vienen del seed (`prisma/seeds/`): cliente `cliente_prueba` / `cliente123` en
la tienda y `admin` / `admin123` en el portal de la empresa.
Los productos `Chifles (demo) con stock` y `sin stock` se cargan con
`SEED_DEMO=true`.
