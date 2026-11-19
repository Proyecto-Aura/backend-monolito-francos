-- FNC-43: pantalla "Notificaciones" bajo "Configuración" (menu del admin).
-- Sin esta migracion el admin no puede navegar a los endpoints de
-- parametros-notificaciones aunque ya existan: en AWS no corren los seeds.
INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id)
SELECT 'notificaciones', 'Notificaciones', 'bell', 'Canales y plantillas de notificaciones', id
FROM persons.ruta WHERE nombre = 'configuracion'
ON CONFLICT DO NOTHING;

INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre = 'admin'
  AND ru.nombre = 'notificaciones'
ON CONFLICT DO NOTHING;
