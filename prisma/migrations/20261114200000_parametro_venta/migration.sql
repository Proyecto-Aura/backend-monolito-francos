-- HU-A-045 (RF-A193 a RF-A195): parámetros de ventas. Fila única (id = 1).

-- CreateTable
CREATE TABLE "commerce"."parametro_venta" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "umbral_mayorista_global" INTEGER NOT NULL DEFAULT 24,
    "umbral_por_producto" BOOLEAN NOT NULL DEFAULT true,
    "promociones_activas" BOOLEAN NOT NULL DEFAULT true,
    "culqi_activo" BOOLEAN NOT NULL DEFAULT true,
    "efectivo_activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_parametro_venta" PRIMARY KEY ("id"),
    CONSTRAINT "ck_parametro_venta_fila_unica" CHECK ("id" = 1)
);

-- Valores iniciales: el comportamiento actual no cambia (todo activo).
INSERT INTO "commerce"."parametro_venta" ("id") VALUES (1)
ON CONFLICT DO NOTHING;

-- Pantalla "Parámetros de ventas" dentro de Configuración, solo para admin
-- (mismo criterio que rutas.seed.ts / accesos.seed.ts para las bases ya creadas).
INSERT INTO persons.ruta (nombre, etiqueta, icono, descripcion, parent_id)
VALUES (
  'parametros-ventas',
  'Parámetros de ventas',
  'sliders-horizontal',
  NULL,
  (SELECT id FROM persons.ruta WHERE nombre = 'configuracion')
)
ON CONFLICT DO NOTHING;

INSERT INTO persons.acceso (rol_id, ruta_id)
SELECT r.id, ru.id
FROM persons.rol r
CROSS JOIN persons.ruta ru
WHERE r.nombre = 'admin'
  AND ru.nombre = 'parametros-ventas'
ON CONFLICT DO NOTHING;
