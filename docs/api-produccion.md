# APIs de producción

`ProductionModule` es responsable de las solicitudes de producción y los lotes
de producto terminado, con sus capas `domain`, `application`, `infrastructure`
y `presentation`. Incluye entidades, estados, contratos de repositorios, DTOs,
casos de uso, adaptadores Prisma, mappers y presenters, con sus tests.

Inventario conserva insumos, lotes de insumos, producto terminado como ficha de
stock y los movimientos de entrada/salida/ajuste. Sus movimientos consumen el
contrato del lote que exporta producción. Catálogo conserva productos y presentaciones.

Todas las rutas siguientes llevan el prefijo `/api/v1` y requieren JWT. No hay
rutas de compatibilidad: son las únicas URLs, tanto para inventario como para
producción; los permisos van por operación, no por vista.

| Operación                                 | Ruta                                                | Roles                          |
| ------------------------------------------ | ---------------------------------------------------- | ------------------------------- |
| Crear solicitud (con su detalle)          | `POST /produccion/solicitudes`                      | admin, inventario               |
| Listar solicitudes e historial            | `GET /produccion/solicitudes`                       | admin, inventario, producción   |
| Consultar indicadores                     | `GET /produccion/solicitudes/indicadores`           | admin, inventario, producción   |
| Consultar detalle, incluido `lote_creado` | `GET /produccion/solicitudes/:id`                   | admin, inventario, producción   |
| Actualizar fecha límite (solo pendiente)  | `PATCH /produccion/solicitudes/:id`                 | admin, inventario               |
| Iniciar, entregar o rechazar              | `PATCH /produccion/solicitudes/:id/estado`          | admin, inventario, producción\* |
| Agregar línea de detalle (solo pendiente) | `POST /produccion/solicitudes/:id/detalle`          | admin, inventario               |
| Editar línea de detalle (solo pendiente)  | `PATCH /produccion/solicitudes/detalle/:detalleId`  | admin, inventario               |
| Quitar línea de detalle (solo pendiente)  | `DELETE /produccion/solicitudes/detalle/:detalleId` | admin, inventario               |
| Registrar un lote producido               | `POST /produccion/lotes-producto-terminado`         | admin, producción               |
| Consultar lotes                           | `GET /produccion/lotes-producto-terminado`          | admin, inventario, producción   |
| Consultar un lote                         | `GET /produccion/lotes-producto-terminado/:id`      | admin, inventario, producción   |

\* inventario solo puede usar este PATCH para rechazar una solicitud pendiente;
producción (o admin, que tiene acceso total) la avanza a `en_proceso`/`entregado`.
Esa regla vive en el caso de uso (`CambiarEstadoSolicitudProduccionUseCase`),
no en el guard de rutas — por eso el rol se valida igual sin importar quién
llame a la ruta.

El PATCH de estado acepta `{ "estado": "en_proceso" }`,
`{ "estado": "entregado" }` o `{ "estado": "rechazado" }`.
Solo se puede rechazar desde pendiente y para entregar debe existir un lote
de cada producto vinculado a esa solicitud. La entrega no genera stock.

El POST de lote conserva su DTO: producto, código, fecha de producción,
cantidad inicial, y opcionalmente fecha de vencimiento, activo, razón y
`solicitud_produccion_id`. Reutiliza la persistencia de inventario, incluida la
entrada inicial que actualiza el stock. No hay tablas ni movimientos duplicados.

## Dependencias y persistencia

`InventoryModule` importa `ProductionModule` para utilizar el contrato del lote.
Producción no importa `InventoryModule`. Ambos importan
`ProductoTerminadoPersistenceModule`, que registra una sola vez el adaptador
del producto terminado; así producción puede validar el producto al crear un
lote y se evita una dependencia circular entre los módulos de negocio.

Los repositorios de solicitudes y lotes se registran únicamente en producción.

```text
production/
  domain/          entidades, estados, contratos y tipos de repositorios
  application/     DTOs, casos de uso y tests
  infrastructure/  repositorios Prisma y mappers
  presentation/    controllers, presenters y composición del módulo
```

No se necesita una migración de base de datos para esta separación.
