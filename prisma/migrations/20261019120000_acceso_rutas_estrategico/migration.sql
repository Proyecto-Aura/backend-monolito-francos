-- Da acceso al rol "estrategico" a todas las pantallas de Gestion
-- Estrategica (Negocio + TI + Plan Estrategico). Los nodos padre
-- ("estrategico", "gestion-estrategica-negocio") no se insertan a
-- proposito: GetMiMenuUseCase ya los muestra automaticamente en cuanto
-- un hijo tiene acceso propio.

INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre = 'estrategico'
  AND ru.nombre IN (
    'plan-estrategico',
    'objetivos-estrategicos',
    'mapa-estrategico',
    'gestionar-kpis',
    'gestionar-iniciativas',
    'tablero-control',
    'analisis-estrategico',
    'gestion-estrategica-ti'
  )
ON CONFLICT DO NOTHING;
