-- unidad_medida_kpi: catálogo sin CRUD, solo semilla.
CREATE UNIQUE INDEX "uq_unidad_nombre"
ON "unidad_medida_kpi" (LOWER(BTRIM("nombre")))
WHERE "estado" = true;

CREATE UNIQUE INDEX "uq_unidad_simbolo"
ON "unidad_medida_kpi" ("simbolo")
WHERE "estado" = true;

ALTER TABLE "unidad_medida_kpi"
ADD CONSTRAINT "chk_unidad_decimales" CHECK ("decimales" BETWEEN 0 AND 4);

-- frecuencia_medicion: catálogo sin CRUD, solo semilla.
CREATE UNIQUE INDEX "uq_frecuencia_nombre"
ON "frecuencia_medicion" (LOWER(BTRIM("nombre")))
WHERE "estado" = true;

CREATE UNIQUE INDEX "uq_frecuencia_periodos"
ON "frecuencia_medicion" ("periodos_por_anio")
WHERE "estado" = true;

ALTER TABLE "frecuencia_medicion"
ADD CONSTRAINT "chk_frecuencia_periodos" CHECK ("periodos_por_anio" IN (1, 2, 4, 6, 12));

-- periodo: catálogo semilla (25 filas), sin CRUD.
CREATE UNIQUE INDEX "uq_periodo_frecuencia_numero"
ON "periodo" ("frecuencia_id", "numero")
WHERE "estado" = true;

CREATE UNIQUE INDEX "uq_periodo_codigo"
ON "periodo" ("codigo")
WHERE "estado" = true;

ALTER TABLE "periodo"
ADD CONSTRAINT "chk_periodo_numero" CHECK ("numero" >= 1);

ALTER TABLE "periodo"
ADD CONSTRAINT "chk_periodo_mes_fin" CHECK ("mes_fin" BETWEEN 1 AND 12);

-- kpi
CREATE INDEX "ix_kpi_objetivo"
ON "kpi" ("objetivo_estrategico_id")
WHERE "estado" = true;

CREATE UNIQUE INDEX "uq_kpi_nombre"
ON "kpi" ("objetivo_estrategico_id", LOWER(BTRIM("nombre")))
WHERE "estado" = true;

CREATE UNIQUE INDEX "uq_kpi_codigo"
ON "kpi" ("codigo")
WHERE "estado" = true;

-- semaforo_config
CREATE UNIQUE INDEX "uq_semaforo_kpi_color"
ON "semaforo_config" ("kpi_id", "anio", "color")
WHERE "estado" = true;

ALTER TABLE "semaforo_config"
ADD CONSTRAINT "chk_semaforo_anio" CHECK ("anio" BETWEEN 2000 AND 2100);

ALTER TABLE "semaforo_config"
ADD CONSTRAINT "chk_semaforo_color" CHECK ("color" IN ('VERDE', 'AMARILLO', 'ROJO'));

ALTER TABLE "semaforo_config"
ADD CONSTRAINT "chk_semaforo_operador" CHECK ("operador" IN ('>=', '>', '<=', '<', '='));

ALTER TABLE "semaforo_config"
ADD CONSTRAINT "chk_semaforo_color_hex" CHECK (
  ("color" = 'VERDE' AND "color_hex" = '#22C55E') OR
  ("color" = 'AMARILLO' AND "color_hex" = '#EAB308') OR
  ("color" = 'ROJO' AND "color_hex" = '#EF4444')
);

-- kpi_meta_anual
CREATE UNIQUE INDEX "uq_kpi_meta_anio"
ON "kpi_meta_anual" ("kpi_id", "anio")
WHERE "estado" = true;

ALTER TABLE "kpi_meta_anual"
ADD CONSTRAINT "chk_meta_anual_anio" CHECK ("anio" BETWEEN 2000 AND 2100);

-- kpi_valor (tabla creada ahora; su caso de uso de registro es un anexo posterior)
CREATE UNIQUE INDEX "uq_kpi_valor_periodo"
ON "kpi_valor" ("kpi_id", "anio", "periodo_id")
WHERE "estado" = true;

CREATE INDEX "ix_kpi_valor_kpi_anio"
ON "kpi_valor" ("kpi_id", "anio")
WHERE "estado" = true;

ALTER TABLE "kpi_valor"
ADD CONSTRAINT "chk_valor_anio" CHECK ("anio" BETWEEN 2000 AND 2100);

ALTER TABLE "kpi_valor"
ADD CONSTRAINT "chk_valor_color" CHECK ("semaforo_color" IN ('VERDE', 'AMARILLO', 'ROJO'));
