-- AWS despliega migraciones sin ejecutar los seeds; estos datos son necesarios para operar.

-- Los futuros datos de referencia deben incluirse en una migración del mismo PR.

INSERT INTO persons.rol (nombre, descripcion) VALUES
  ('admin', NULL),
  ('ventas', NULL),
  ('cliente', NULL),
  ('inventario', NULL),
  ('produccion', NULL),
  ('estrategico', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO strategic.estado_plan_estrategico (codigo, nombre, orden) VALUES
  ('BORRADOR', 'Borrador', 1),
  ('ACTIVO', 'Activo', 2),
  ('CERRADO', 'Cerrado', 3)
ON CONFLICT DO NOTHING;

INSERT INTO strategic.perspectiva_bsc (nombre, orden) VALUES
  ('Financiera', 1),
  ('Cliente', 2),
  ('Procesos Internos', 3),
  ('Aprendizaje y Crecimiento', 4)
ON CONFLICT DO NOTHING;

INSERT INTO strategic.tipo_modulo (codigo, nombre) VALUES
  ('NEG', 'Negocio'),
  ('TI', 'TI')
ON CONFLICT DO NOTHING;

INSERT INTO strategic.estado_objetivo (codigo, nombre, orden) VALUES
  ('PENDIENTE', 'Pendiente', 1),
  ('EN_PROCESO', 'En Proceso', 2),
  ('CUMPLIDO', 'Cumplido', 3),
  ('CANCELADO', 'Cancelado', 4)
ON CONFLICT DO NOTHING;

INSERT INTO strategic.estado_iniciativa (codigo, nombre, orden) VALUES
  ('PENDIENTE', 'Pendiente', 1),
  ('EN_PROCESO', 'En Proceso', 2),
  ('COMPLETADA', 'Completada', 3),
  ('CANCELADA', 'Cancelada', 4)
ON CONFLICT DO NOTHING;

INSERT INTO strategic.unidad_medida_kpi (nombre, simbolo, decimales) VALUES
  ('Porcentaje', '%', 2),
  ('Soles', 'S/', 2),
  ('Unidades', 'und', 0),
  ('Días', 'd', 1),
  ('Horas', 'h', 1),
  ('Ratio', 'x', 2),
  ('Puntaje', 'pts', 1)
ON CONFLICT DO NOTHING;

INSERT INTO strategic.frecuencia_medicion (nombre, periodos_por_anio, orden) VALUES
  ('Mensual', 12, 1),
  ('Bimestral', 6, 2),
  ('Trimestral', 4, 3),
  ('Semestral', 2, 4),
  ('Anual', 1, 5)
ON CONFLICT DO NOTHING;

INSERT INTO strategic.periodo (frecuencia_id, numero, codigo, nombre, mes_fin) VALUES
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 1, 'M1', 'Enero', 1),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 2, 'M2', 'Febrero', 2),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 3, 'M3', 'Marzo', 3),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 4, 'M4', 'Abril', 4),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 5, 'M5', 'Mayo', 5),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 6, 'M6', 'Junio', 6),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 7, 'M7', 'Julio', 7),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 8, 'M8', 'Agosto', 8),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 9, 'M9', 'Septiembre', 9),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 10, 'M10', 'Octubre', 10),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 11, 'M11', 'Noviembre', 11),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Mensual'), 12, 'M12', 'Diciembre', 12),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Bimestral'), 1, 'B1', 'Bimestre 1', 2),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Bimestral'), 2, 'B2', 'Bimestre 2', 4),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Bimestral'), 3, 'B3', 'Bimestre 3', 6),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Bimestral'), 4, 'B4', 'Bimestre 4', 8),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Bimestral'), 5, 'B5', 'Bimestre 5', 10),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Bimestral'), 6, 'B6', 'Bimestre 6', 12),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Trimestral'), 1, 'T1', 'Trimestre 1', 3),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Trimestral'), 2, 'T2', 'Trimestre 2', 6),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Trimestral'), 3, 'T3', 'Trimestre 3', 9),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Trimestral'), 4, 'T4', 'Trimestre 4', 12),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Semestral'), 1, 'S1', 'Semestre 1', 6),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Semestral'), 2, 'S2', 'Semestre 2', 12),
  ((SELECT id FROM strategic.frecuencia_medicion WHERE nombre = 'Anual'), 1, 'A1', 'Anual', 12)
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('inventario', 'Inventario', 'package', 'Control de stock y productos', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('insumos', 'Insumos', 'box', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'inventario'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('stock-insumos', 'Stock de insumos', 'boxes', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'insumos'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('solicitudes-insumos', 'Solicitudes de insumos', 'clipboard-list', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'insumos'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('productos-terminados', 'Productos terminados', 'recycle', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'inventario'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('stock-productos', 'Stock de productos', 'boxes', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'productos-terminados'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('pedidos-por-preparar', 'Pedidos por preparar', 'shopping-cart', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'productos-terminados'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('solicitudes-produccion', 'Solicitudes a producción', 'clipboard-list', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'productos-terminados'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('ventas', 'Ventas', 'store', 'Gestión de ventas y pedidos', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('clientes', 'Clientes', 'users', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'ventas'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('catalogo', 'Catálogo', 'package', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'ventas'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('gestion-productos', 'Gestión de productos', 'list', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'catalogo'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('configuracion-catalogo', 'Configuración del catálogo', 'settings', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'catalogo'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('mis-pedidos', 'Mis pedidos', 'shopping-cart', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'ventas'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('gestion-pedidos', 'Gestión de pedidos', 'clipboard-list', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'mis-pedidos'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('reembolsos', 'Reembolsos', 'rotate-ccw', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'mis-pedidos'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('estrategico', 'Gestión Estratégica', 'compass', 'Planeamiento y seguimiento estratégico', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('plan-estrategico', 'Plan estratégico', 'target', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'estrategico'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('gestion-estrategica-negocio', 'Gestión estratégica de negocio', 'building-2', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'estrategico'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('objetivos-estrategicos', 'Gestión de objetivos estratégicos', 'flag', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'gestion-estrategica-negocio'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('mapa-estrategico', 'Mapa estratégico', 'map', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'gestion-estrategica-negocio'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('gestionar-kpis', 'Gestionar KPIs', 'bar-chart-3', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'gestion-estrategica-negocio'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('gestionar-iniciativas', 'Gestionar iniciativas', 'rocket', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'gestion-estrategica-negocio'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('tablero-control', 'Tablero de control', 'layout-dashboard', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'gestion-estrategica-negocio'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('analisis-estrategico', 'Análisis estratégico', 'folder-open', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'gestion-estrategica-negocio'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id) VALUES
  ('gestion-estrategica-ti', 'Gestión estratégica de TI', 'monitor', NULL, (SELECT id FROM persons.ruta WHERE nombre = 'estrategico'))
ON CONFLICT DO NOTHING;

INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id FROM persons.rol r CROSS JOIN persons.ruta ru
WHERE r.nombre = 'admin'
ON CONFLICT DO NOTHING;
