# QA de Francos

Pruebas que ven el sistema desde fuera: la tienda (`frontend-cliente-angular`)
en un navegador real, contra la API de este repo y una base PostgreSQL
desechable. En CI las corre `.github/workflows/qa.yml`; nunca apuntan a AWS.

Esta carpeta es un proyecto **npm** propio, aislado del workspace pnpm del
backend: no entra en el build, el lint, Jest ni la imagen Docker.

## Qué hay

| Ruta | Qué prueba |
| --- | --- |
| `e2e/humo.spec.ts` | Login del cliente de prueba y catálogo con productos. Si falla, el entorno no sirve. |

## Correrlo en local

Necesitas tres cosas arriba: PostgreSQL, la API en `:3000` y la tienda en `:4200`.

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

3. **Pruebas** (en esta carpeta):

   ```bash
   npm ci
   npx playwright install chromium
   npm run test:e2e
   npm run report      # abre el reporte HTML con trazas de los fallos
   ```

`QA_TIENDA_URL` cambia la URL de la tienda (por defecto `http://localhost:4200`).

## Usuarios de prueba

Vienen del seed (`prisma/seeds/`): cliente `cliente_prueba` / `cliente123`.
Los productos `Chifles (demo) con stock` y `sin stock` se cargan con
`SEED_DEMO=true`.
