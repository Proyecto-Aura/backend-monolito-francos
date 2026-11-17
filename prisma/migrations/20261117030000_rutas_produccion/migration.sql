-- El rol "produccion" ya existe en SQL (20261019000000_datos_referencia,
-- 20261026000000_descripcion_roles), pero su menu propio hasta ahora solo
-- vivia en prisma/seeds/rutas.seed.ts, que no corre en AWS. Sin esta
-- migracion el rol produccion no tiene ninguna pantalla.
INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id)
VALUES ('produccion', 'Producción', 'handshake', 'Control de producción', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id)
SELECT 'produccion-solicitudes', 'Solicitudes de producción', 'clipboard-list', NULL, id
FROM persons.ruta WHERE nombre = 'produccion'
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id)
SELECT 'produccion-solicitudes-insumos', 'Solicitudes de insumos', 'clipboard-list', NULL, id
FROM persons.ruta WHERE nombre = 'produccion'
ON CONFLICT DO NOTHING;

-- Mismo criterio que RUTAS_DESPACHO/RUTAS_INSUMOS en accesos.seed.ts: solo
-- acceso explicito a las pantallas reales, el padre "produccion" se
-- muestra solo por ser ancestro de una pantalla permitida.
INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre IN ('admin', 'produccion')
  AND ru.nombre IN ('produccion-solicitudes', 'produccion-solicitudes-insumos')
ON CONFLICT DO NOTHING;
