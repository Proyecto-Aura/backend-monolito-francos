-- Descripción para la tarjeta de Home de Despachos (quedó en NULL cuando se
-- creó la ruta), y una pantalla hija ("Gestión de despachos") para que el
-- sidebar del módulo no quede vacío ahora que despacho-pedidos es de primer
-- nivel -- mismo criterio que productos-terminados/pedidos-por-preparar.
UPDATE persons.ruta
SET descripcion = 'Seguimiento y entrega de pedidos'
WHERE nombre = 'despacho-pedidos';

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id)
VALUES (
  'gestion-despachos',
  'Gestión de despachos',
  'clipboard-list',
  NULL,
  (SELECT id FROM persons.ruta WHERE nombre = 'despacho-pedidos')
)
ON CONFLICT DO NOTHING;

-- Mismo criterio que RUTAS_DESPACHO en accesos.seed.ts: solo se da acceso
-- explícito a la pantalla real, el padre se muestra solo (ancestro de un
-- hijo permitido).
INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre IN ('admin', 'despacho')
  AND ru.nombre = 'gestion-despachos'
ON CONFLICT DO NOTHING;
