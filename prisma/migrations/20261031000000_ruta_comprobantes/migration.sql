-- Pantalla Series de comprobantes (HU-A-044) dentro del módulo Configuración. AWS no
-- corre los seeds, así que va aquí; rutas.seed.ts la mantiene para local y CI.
-- El `nombre` debe ser igual al `path` de la ruta del front.
INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('comprobantes', 'Series de comprobantes', 'receipt', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'configuracion'))
ON CONFLICT DO NOTHING;

-- El admin no hereda las rutas nuevas: necesita su acceso explícito.
INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre = 'admin'
  AND ru.nombre = 'comprobantes'
ON CONFLICT DO NOTHING;
