# FRANCO'S ERP — Backend

Sistema web de gestión empresarial para FRANCO'S Snacks Naturales. Monolito modular NestJS con Clean Architecture, Prisma ORM y PostgreSQL.

## Stack

- **Runtime:** Node.js v26 + TypeScript
- **Framework:** NestJS 11
- **ORM:** Prisma 7 (cliente generado en `generated/prisma/`)
- **Base de datos:** PostgreSQL
- **Autenticación:** JWT + bcrypt
- **Docs:** Swagger (`/api/docs`)
- **Package manager:** pnpm

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

Copia `.env` y ajusta los valores:

```bash
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/francos_erp?schema=public"
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:4200
```

## Comandos

### Instalación

```bash
pnpm install
```

### Prisma

```bash
# Generar cliente (correr siempre después de cambiar schema.prisma)
pnpm exec prisma generate

# Crear y aplicar una migración
pnpm exec prisma migrate dev --name <nombre>

# Aplicar migraciones en producción (solo en prod, no crea migraciones nuevas)
pnpm exec prisma migrate deploy

# Abrir Prisma Studio (explorador visual de BD)
pnpm exec prisma studio
```

### Desarrollo

```bash
# Modo watch (recomendado en desarrollo)
pnpm start:dev

# Compilar
pnpm build

# Producción
pnpm start:prod
```

### Tests

```bash
pnpm test          # unit tests
pnpm test:e2e      # end-to-end
pnpm test:cov      # cobertura
```

## Arquitectura

Cada módulo sigue la misma estructura de capas:

```
modules/<dominio>/
  domain/
    entities/          ← Entidades de dominio (clases planas)
    repositories/      ← Contratos abstractos (interfaces de DI)
  application/
    dto/               ← Validación de entrada (class-validator)
    use-cases/         ← Lógica de negocio
  infrastructure/
    repositories/      ← Implementaciones Prisma
    mappers/           ← Prisma model ↔ Domain entity
  presentation/
    controllers/       ← HTTP controllers
    <modulo>.module.ts ← Módulo NestJS (wiring de DI)
```

## URLs

| Ruta | Descripción |
|------|-------------|
| `http://localhost:3000/api/v1` | Base URL de la API |
| `http://localhost:3000/api/docs` | Swagger UI |
