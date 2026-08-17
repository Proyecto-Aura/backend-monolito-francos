# FRANCO'S ERP — Backend

Sistema web de gestión empresarial para FRANCO'S Snacks Naturales. Monolito modular NestJS con Clean Architecture, Prisma ORM y PostgreSQL.

## Stack

| Herramienta | Versión | Rol |
|-------------|---------|-----|
| Node.js | v26 | Runtime |
| TypeScript | 5.x | Lenguaje |
| NestJS | 11 | Framework |
| Prisma | 7 | ORM (`prisma-client-js` + `@prisma/adapter-pg`) |
| PostgreSQL | 16 | Base de datos |
| JWT + bcrypt | — | Autenticación |
| Swagger | — | Documentación API (`/api/docs`) |
| Docker | — | Base de datos local |
| pnpm | 11 | Package manager |

## Módulos de dominio

| Módulo | Responsabilidad |
|--------|----------------|
| `AuthModule` | Autenticación JWT, RBAC |
| `PersonsModule` | Clientes, proveedores, usuarios |
| `SalesModule` | Pedidos, pagos, reembolsos |
| `InventoryModule` | Insumos, productos terminados, movimientos |
| `ProductionModule` | Órdenes y solicitudes de producción |
| `StrategicModule` | BSC, KPIs, objetivos estratégicos |

## Variables de entorno

Crea un archivo `.env` en la raíz con:

```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/francos_erp?schema=public"
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:4200
```

## Inicio rápido

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Levantar la base de datos

```bash
docker compose up -d
```

### 3. Correr migraciones y generar cliente

```bash
pnpm exec prisma migrate deploy 
pnpm exec prisma generate
```

### 4. Iniciar en modo desarrollo

```bash
pnpm start:dev
```

## Comandos

### Base de datos (Docker)

```bash
docker compose up -d      # Levantar PostgreSQL en background
docker compose down       # Apagar (conserva los datos)
docker compose down -v    # Apagar y borrar volumen de datos
```

### Prisma

```bash
# Generar cliente (correr siempre después de cambiar schema.prisma)
pnpm exec prisma generate

# Crear y aplicar una migración en desarrollo
pnpm exec prisma migrate dev --name <nombre>

# Aplicar migraciones en producción
pnpm exec prisma migrate deploy

# Ver estado de migraciones
pnpm exec prisma migrate status

# Abrir explorador visual de BD
pnpm exec prisma studio

# Ejecutar el seed (datos iniciales)
pnpm exec prisma db seed
```

### Cómo crear un seed

Un **seed** es un script que llena la base de datos con datos iniciales que la app necesita para funcionar (catálogo base, no datos de prueba random) — por ejemplo, los roles del sistema. Vive en `prisma/seed.ts` y se ejecuta con `pnpm exec prisma db seed`.

Hay dos detalles de este proyecto que **siempre** hay que respetar al escribir uno:

**1. El adaptador de conexión es obligatorio.** El `datasource` de `schema.prisma` no tiene `url = env("DATABASE_URL")` — la conexión se arma a mano con `PrismaPg`, igual que hace `PrismaService`. Un seed que use `new PrismaClient()` a secas, sin adaptador, no podrá conectarse.

**2. Usa `upsert`, no `create`, para que el seed sea repetible.** Si corres el seed dos veces y usas `create`, la segunda vez explota por violar un `@unique`. Con `upsert` (busca por un campo único; si existe no hace nada, si no existe lo crea) puedes correrlo las veces que quieras sin miedo.

**3. Prisma necesita saber qué comando correr.** Esto se declara una sola vez en `package.json`, como una clave nueva a nivel raíz (hermana de `"scripts"`, `"dependencies"`, etc.):

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Sin esto, `pnpm exec prisma db seed` no sabe qué archivo ejecutar. Si en el futuro tienes varios seeds, este sigue siendo el único "punto de entrada" — tu `seed.ts` es responsable de llamar a los demás si hace falta.

Plantilla base de cualquier seed nuevo:

```ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Conexión: mismo adaptador que PrismaService, porque el schema no trae `url`.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 2. Tu lógica de seed acá, siempre con upsert() sobre un campo @unique.
}

// 3. Boilerplate estándar: corre main(), reporta éxito/error, y SIEMPRE
//    cierra la conexión al final (si no, el script queda "colgado").
main()
  .then(() => console.log('Seed completado'))
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### ¿Y si necesito más de un seed?

`prisma db seed` solo puede ejecutar **un** comando (el que está en `package.json`). Cuando haya más de un seed, `seed.ts` deja de tener la lógica directamente y pasa a ser un **orquestador**: abre la conexión una sola vez y llama, en orden, a funciones que viven en `prisma/seeds/`, una por archivo:

```
prisma/
  seed.ts              ← único punto de entrada (registrado en package.json)
  seeds/
    roles.seed.ts       ← la lógica de un seed específico
    admin.seed.ts        (el que corresponda)
```

Cada archivo dentro de `seeds/` exporta una función que **recibe el `prisma` ya conectado**, no crea su propio cliente:

```ts
// prisma/seeds/roles.seed.ts
import { PrismaClient } from '@prisma/client';

const ROLES_BASE = ['admin', 'ventas', 'cliente'];

export async function seedRoles(prisma: PrismaClient) {
  for (const nombre of ROLES_BASE) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre, descripcion: null, estado: true },
    });
    console.log(`Rol "${nombre}" listo`);
  }
}
```

Y `seed.ts` pasa a ser solo el orquestador:

```ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedRoles } from './seeds/roles.seed';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await seedRoles(prisma);
  // await seedOtraCosa(prisma);  ← así se agrega un seed nuevo
}

main()
  .then(() => console.log('Seed completado'))
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Dos reglas al aplicar este patrón:
1. **Un solo `PrismaClient`**, creado una vez en `seed.ts` y pasado por parámetro a cada función — si cada archivo abriera su propia conexión, necesitarías desconectar cada una por separado.
2. **El orden en `main()` importa** si un seed depende de datos que otro creó (por ejemplo, un seed de usuario admin debe correr *después* de `seedRoles`, porque necesita que el rol "admin" ya exista).

`package.json` no cambia — `"seed": "ts-node prisma/seed.ts"` sigue apuntando al mismo archivo, que ahora hace de orquestador. Mientras solo haya un seed (como ahora, con roles), no hace falta partirlo en carpeta — es una abstracción que solo vale la pena cuando aparece un segundo seed real.

### Desarrollo

```bash
pnpm start:dev    # Modo watch
pnpm build        # Compilar
pnpm start:prod   # Producción
```

### Tests

```bash
pnpm test         # Unit tests
pnpm test:e2e     # End-to-end
pnpm test:cov     # Cobertura
```

## Arquitectura

Cada módulo de dominio sigue la misma estructura de capas (Clean Architecture):

```
modules/<dominio>/
  domain/
    entities/          ← Entidades de dominio (clases planas, sin frameworks)
    repositories/      ← Contratos abstractos (tokens de DI)
  application/
    dto/               ← Validación de entrada (class-validator)
    use-cases/         ← Lógica de negocio pura
  infrastructure/
    repositories/      ← Implementaciones con Prisma
    mappers/           ← Prisma model ↔ Domain entity
  presentation/
    controllers/       ← HTTP controllers
    <modulo>.module.ts ← Wiring de dependencias (NestJS DI)
```

La base de datos es compartida a través de un `PrismaModule` global (`@Global()`), lo que evita importarlo en cada módulo.

## URLs

| Ruta | Descripción |
|------|-------------|
| `http://localhost:3000/api/v1` | Base URL de la API |
| `http://localhost:3000/api/docs` | Swagger UI |
