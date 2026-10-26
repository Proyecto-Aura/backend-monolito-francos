-- Descripciones de los roles para Configuración > Roles y permisos (HU-A-042).
-- AWS no corre los seeds, así que van aquí; roles.seed.ts las mantiene para local y CI.
-- Solo se escriben si el rol aún no tiene una, para no pisar una editada a mano.
UPDATE persons.rol AS r
SET descripcion = d.descripcion
FROM (VALUES
  ('admin', 'Acceso total al sistema'),
  ('ventas', 'Gestión de ventas, clientes y catálogo'),
  ('inventario', 'Control de stock e insumos'),
  ('produccion', 'Órdenes y solicitudes de producción'),
  ('estrategico', 'Planeamiento y seguimiento estratégico (BSC, KPIs, objetivos, iniciativas)'),
  ('despacho', 'Preparación y entrega de pedidos'),
  ('cliente', 'Cuenta del portal del cliente')
) AS d(nombre, descripcion)
WHERE r.nombre = d.nombre AND r.descripcion IS NULL;
