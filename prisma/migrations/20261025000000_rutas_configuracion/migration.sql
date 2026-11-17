-- Módulo Configuración del portal de la empresa (HU-A-039..046): ruta padre
-- (tarjeta del home) y las pantallas hijas que ya existen. AWS no corre los
-- seeds, así que van aquí; rutas.seed.ts las mantiene para local y CI.
-- Cada `nombre` debe ser igual al `path` de la ruta del front.
INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('configuracion', 'Configuración', 'settings', 'Datos de la empresa, usuarios y permisos', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('empresa', 'Datos de la empresa', 'building-2', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'configuracion'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('usuarios', 'Usuarios internos', 'users', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'configuracion'))
ON CONFLICT DO NOTHING;

-- El admin no hereda las rutas nuevas: necesita su acceso explícito. El padre
-- también lo lleva, porque Configuración es solo del admin.
INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre = 'admin'
  AND ru.nombre IN ('configuracion', 'empresa', 'usuarios')
ON CONFLICT DO NOTHING;
