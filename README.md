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

### 3. Generar cliente Prisma y correr migraciones

```bash
pnpm exec prisma generate
pnpm exec prisma migrate dev --name init
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
```

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
