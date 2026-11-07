-- Pantalla Despachos (HU-A-023) dentro del módulo Inventario. AWS no corre los
-- seeds, así que va aquí; rutas.seed.ts y accesos.seed.ts la mantienen para
-- local y CI. El `nombre` debe ser igual al `path` de la ruta del front.
INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('despacho-pedidos', 'Despachos', 'truck', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'inventario'))
ON CONFLICT DO NOTHING;

-- Ni el admin ni el rol despacho heredan las rutas nuevas: necesitan su acceso
-- explícito. El padre (inventario) se muestra solo, sin acceso propio, porque
-- el menú incluye los ancestros de cada ruta permitida.
INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre IN ('admin', 'despacho')
  AND ru.nombre = 'despacho-pedidos'
ON CONFLICT DO NOTHING;
