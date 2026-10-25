-- Rutas hijas de "gestion-estrategica-ti", analogas a las que ya existen
-- bajo "gestion-estrategica-negocio". Acceso para admin y estrategico —
-- a diferencia de la migracion anterior de este plan, admin SI necesita
-- la fila explicita porque datos_referencia solo le dio las rutas que
-- existian en ese momento.

INSERT INTO persons.ruta (nombre, etiqueta, icono, parent_id)
SELECT 'objetivos-estrategicos-ti', 'Gestión de objetivos estratégicos de TI', 'flag', id
FROM persons.ruta WHERE nombre = 'gestion-estrategica-ti'
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, parent_id)
SELECT 'mapa-estrategico-ti', 'Mapa estratégico de TI', 'map', id
FROM persons.ruta WHERE nombre = 'gestion-estrategica-ti'
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, parent_id)
SELECT 'gestionar-kpis-ti', 'Gestionar KPIs de TI', 'bar-chart-3', id
FROM persons.ruta WHERE nombre = 'gestion-estrategica-ti'
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, parent_id)
SELECT 'gestionar-iniciativas-ti', 'Gestionar iniciativas de TI', 'rocket', id
FROM persons.ruta WHERE nombre = 'gestion-estrategica-ti'
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, parent_id)
SELECT 'tablero-control-ti', 'Tablero de control de TI', 'layout-dashboard', id
FROM persons.ruta WHERE nombre = 'gestion-estrategica-ti'
ON CONFLICT DO NOTHING;

INSERT INTO persons.ruta (nombre, etiqueta, icono, parent_id)
SELECT 'analisis-estrategico-ti', 'Análisis estratégico de TI', 'folder-open', id
FROM persons.ruta WHERE nombre = 'gestion-estrategica-ti'
ON CONFLICT DO NOTHING;

INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre IN ('admin', 'estrategico')
  AND ru.nombre IN (
    'objetivos-estrategicos-ti',
    'mapa-estrategico-ti',
    'gestionar-kpis-ti',
    'gestionar-iniciativas-ti',
    'tablero-control-ti',
    'analisis-estrategico-ti'
  )
ON CONFLICT DO NOTHING;
