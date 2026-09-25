# Cómo contribuir al backend de FRANCO'S ERP

Convenciones del equipo. Si es tu primera vez, lee al menos "Preparar tu entorno" y "Tests".

---

## Preparar tu entorno

```bash
nvm use                 # lee .nvmrc → Node 24 LTS
corepack enable         # habilita pnpm en la versión que fija package.json
pnpm install
docker compose up -d    # PostgreSQL 17.10 en el puerto 5432
pnpm prisma migrate deploy
pnpm prisma db seed     # crea los roles y el usuario admin/admin123
pnpm start:dev
```

Las variables de entorno van en un `.env` en la raíz (no se versiona). Las claves que exige la app están en `src/config/envs.ts`; el `README.md` tiene un ejemplo.

> **Si ya tenías el proyecto de antes:** la base de datos pasó de PostgreSQL 16 a 17.10 (la misma versión que tendrá producción). Postgres no actualiza el formato de datos entre versiones mayores, así que el volumen viejo no arranca:
> ```bash
> docker compose down -v && docker compose up -d
> pnpm prisma migrate deploy && pnpm prisma db seed
> ```
> Y Node quedó fijado en **24 LTS**. Si usas otra versión, pnpm te mostrará un aviso al instalar.

---

## Ramas y commits

**Ramas** desde `develop`:

```
feature/<jira-key-en-minúscula>-<descripción>     feature/oft0-243-login-guards
fix/<descripción>
chore/<descripción>
```

Los PRs siempre van hacia `develop`. A `main` solo llega lo que viene de `develop`.

**Commits** en formato Conventional Commits, en español:

```
tipo(scope): descripción

feat(persons): agrega endpoint para actualizar cliente
fix(auth): corrige expiración del refresh token
test(catalog): agrega unit tests de create-producto
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`. El scope es el módulo (`auth`, `persons`, `catalog`, `common`…).

---

## Tests

Hay dos tipos y **cada uno vive en un sitio distinto**. Jest está configurado para buscarlos en carpetas diferentes, así que la ubicación no es una preferencia de estilo: un archivo en el lugar equivocado simplemente no se ejecuta.

| Tipo | Dónde | Nombre | Comando |
|---|---|---|---|
| **Unitario** | dentro de `src/`, **junto al archivo que prueba** | `*.spec.ts` | `pnpm test` |
| **E2E** | dentro de `test/` | `*.e2e-spec.ts` | `pnpm test:e2e` |

### Unitarios

Prueban **una clase aislada**, sin base de datos ni red. Las dependencias se reemplazan por mocks.

```
src/modules/catalog/application/use-cases/producto/
  create-producto.use-case.ts
  create-producto.use-case.spec.ts    ← aquí, al lado
```

Qué probar: la lógica de negocio de los use-cases nuevos o modificados. Cada regla (nombre duplicado, estado inválido, transición no permitida) es un caso de test.

Patrón: instanciar el use-case directamente con mocks manuales de los repositorios abstractos. No hace falta el `TestingModule` de Nest para clases que no dependen del framework.

```ts
const mockRepo: jest.Mocked<ProductoRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  existsByName: jest.fn(),
};
```

### E2E

Levantan la aplicación **completa** contra una base de datos real y le hacen peticiones HTTP, igual que haría el frontend.

**Obligatorio para cada endpoint nuevo o cuya autorización cambió**, probando los tres casos:

| Caso | Esperado |
|---|---|
| Sin token | `401` |
| Con token de un rol que no corresponde | `403` |
| Con el rol correcto | `2xx` |

Esto no es opcional ni ceremonial: un test unitario con mocks **nunca** detecta que se te olvidó poner `@Roles('admin')` en el controller. Este e2e sí.

Para correrlos necesitas la base de datos levantada, migrada y con el seed aplicado (el e2e hace login con `admin/admin123`).

---

## Definition of Done

Antes de abrir el PR:

1. `pnpm build` sin errores.
2. `pnpm lint` sin errores nuevos **en los archivos que tocaste**.
3. Tests unitarios para los use-cases nuevos o modificados.
4. Tests e2e para endpoints nuevos o con autorización cambiada.
5. **Los ejecutaste de verdad** y pegas la salida real en el PR.
6. Swagger actualizado: `@ApiTags`, `@ApiOperation`, y `@ApiBearerAuth()` en rutas protegidas.
7. Revisión de seguridad propia: ¿alguna ruta quedó pública sin `@Public()`? ¿se validan todos los inputs con DTO? ¿nada de contraseñas, tokens ni datos personales en logs o respuestas?

La plantilla del PR trae este checklist; aparece sola al abrirlo.

---

## Reglas de código

- **Toda ruta nueva nace protegida.** Los guards son globales; una ruta pública debe marcarse explícitamente con `@Public()`.
- Los use-cases dependen de **repositorios abstractos** del dominio, nunca de Prisma directamente. La implementación se enlaza en el `*.module.ts`.
- Los errores de negocio son clases de error de dominio, traducidas a HTTP en el filtro del módulo. No lanzar `HttpException` desde un use-case.
- Operaciones que tocan varias tablas → `prisma.$transaction`.
- Sin SQL crudo (`$queryRawUnsafe` está prohibido).
- Nombres de campos en español y `snake_case`, como en el schema de Prisma.
- Nunca editar una migración ya existente. Para cambios de schema: `pnpm prisma migrate dev --name <nombre>`.

Formato: `pnpm lint` y `pnpm format` sobre los archivos que tocaste. **No reformatees archivos que no estés modificando** — el repo arrastra deuda de formato que se va a saldar en una tarea aparte.

---

## Qué hace el CI

Cada PR hacia `develop` o `main`, y cada push a esas ramas, dispara el pipeline:

```
build  →  lint · test-unit · test-e2e · docker · security   (en paralelo)
```

| Job | Qué verifica | ¿Bloquea? |
|---|---|---|
| `build` | Que el proyecto compile | Sí |
| `lint` | ESLint + Prettier | **No por ahora** (deuda heredada) |
| `test-unit` | `jest` sobre los `*.spec.ts` de `src/` | Sí |
| `test-e2e` | La app completa contra un PostgreSQL 17.10 real | Sí |
| `docker` | Que la imagen se construya **y arranque** | Sí |
| `security` | Dependencias vulnerables y secretos filtrados | Sí en críticas y en secretos |

Los resultados aparecen al pie del PR. Si algo sale en rojo, el log dice exactamente qué archivo y qué línea.

Si un PR queda en rojo por algo que ya venía roto en `develop` y no por tu cambio, avisa en vez de ignorarlo.

---

## Revisión de seguridad

Además del CI, hay una revisión manual de seguridad sobre los PRs que tocan endpoints (pruebas de OWASP Top 10 desde la vista de un atacante: XSS, IDOR, Broken Access Control, Mass Assignment, SQL Injection).

Por eso la plantilla del PR pide una sección de **"superficie de ataque"**: los endpoints que tocaste y con qué rol se usan. Sin eso, quien revisa tiene que adivinar por dónde entrar.

Conviene mandar PRs **incrementales, por funcionalidad**, y no un bloque grande al final: es más rápido de revisar y los problemas se encuentran cuando todavía son baratos de arreglar.
