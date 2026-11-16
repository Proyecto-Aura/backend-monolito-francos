-- El rol "inventario" se separa en dos actores: "insumos" (nuevo, gestiona
-- insumos y su stock) e "inventario" (solo productos terminados). AWS no corre
-- los seeds, así que va aquí; roles.seed.ts, rutas.seed.ts y accesos.seed.ts
-- lo mantienen para local y CI.

-- Rol nuevo, y la descripción de inventario deja de mencionar insumos (solo
-- si sigue siendo la original, para no pisar una editada a mano).
INSERT INTO persons.rol (nombre, descripcion) VALUES
  ('insumos', 'Gestión de insumos y su stock')
ON CONFLICT DO NOTHING;

UPDATE persons.rol
SET descripcion = 'Control de stock de productos terminados'
WHERE nombre = 'inventario'
  AND descripcion = 'Control de stock e insumos';

-- Insumos pasa a ser un módulo de primer nivel (mismo criterio que Despachos,
-- 20261109092055_despacho_modulo_propio_no_subopcion), con descripción para
-- la tarjeta de Home.
UPDATE persons.ruta
SET parent_id = NULL,
    descripcion = 'Gestión de insumos y su stock'
WHERE nombre = 'insumos';

-- Inventario se aplana: las pantallas de productos terminados cuelgan
-- directo del módulo y el nodo intermedio "productos-terminados" desaparece.
UPDATE persons.ruta
SET parent_id = (SELECT id FROM persons.ruta WHERE nombre = 'inventario')
WHERE nombre IN ('stock-productos', 'pedidos-por-preparar', 'solicitudes-produccion');

DELETE FROM persons.acceso
WHERE ruta_id = (SELECT id FROM persons.ruta WHERE nombre = 'productos-terminados');

DELETE FROM persons.ruta
WHERE nombre = 'productos-terminados';

-- El rol inventario ya no puede operar insumos (los endpoints pasan a
-- @Roles('admin', 'insumos')): se le quitan esas pantallas del menú.
DELETE FROM persons.acceso
WHERE rol_id = (SELECT id FROM persons.rol WHERE nombre = 'inventario')
  AND ruta_id IN (
    SELECT id FROM persons.ruta
    WHERE nombre IN ('insumos', 'stock-insumos', 'solicitudes-insumos')
  );

-- Mismo criterio que RUTAS_INSUMOS en accesos.seed.ts: acceso explícito a las
-- pantallas reales, el padre (insumos) se muestra solo por ser ancestro.
INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre = 'insumos'
  AND ru.nombre IN ('stock-insumos', 'solicitudes-insumos')
ON CONFLICT DO NOTHING;
