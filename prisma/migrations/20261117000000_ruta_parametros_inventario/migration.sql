-- HU-A-046 Gestionar parámetros de inventario (RF-A196): pantalla "Parámetros
-- de inventario" dentro de Configuración, solo para admin (mismo criterio que
-- rutas.seed.ts / accesos.seed.ts para las bases ya creadas).
INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id)
VALUES (
  'parametros-inventario',
  'Parámetros de inventario',
  'boxes',
  NULL,
  (SELECT id FROM persons.ruta WHERE nombre = 'configuracion')
)
ON CONFLICT DO NOTHING;

INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre = 'admin'
  AND ru.nombre = 'parametros-inventario'
ON CONFLICT DO NOTHING;
