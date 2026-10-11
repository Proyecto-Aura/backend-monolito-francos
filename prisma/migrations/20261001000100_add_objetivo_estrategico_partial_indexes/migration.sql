-- Un OE no puede repetir nombre dentro del mismo plan y tipo_modulo (puede repetirse entre planes o entre Negocio/TI).
CREATE UNIQUE INDEX "uq_oe_nombre"
ON "objetivo_estrategico" ("plan_estrategico_id", "tipo_modulo_id", LOWER(BTRIM("nombre")))
WHERE "estado" = true;

-- Filtro constante en listado (RF-A112) y mapa (RF-A114).
CREATE INDEX "ix_oe_plan_tipo"
ON "objetivo_estrategico" ("plan_estrategico_id", "tipo_modulo_id")
WHERE "estado" = true;

-- Recorrido del alineamiento TI-Negocio (RF-A164, historia futura).
CREATE INDEX "ix_oe_negocio"
ON "objetivo_estrategico" ("oe_negocio_id")
WHERE "oe_negocio_id" IS NOT NULL;

-- Un OE nunca puede alinearse a sí mismo.
ALTER TABLE "objetivo_estrategico"
ADD CONSTRAINT "chk_oe_negocio_distinto"
CHECK ("oe_negocio_id" IS NULL OR "oe_negocio_id" <> "id");

-- No se puede registrar la misma relación causa-efecto dos veces.
CREATE UNIQUE INDEX "uq_relacion_oe"
ON "relacion_oe" ("origen_id", "destino_id")
WHERE "estado" = true;

-- El mapa se recorre en ambos sentidos.
CREATE INDEX "ix_relacion_destino"
ON "relacion_oe" ("destino_id")
WHERE "estado" = true;

-- Un objetivo no puede causarse a sí mismo.
ALTER TABLE "relacion_oe"
ADD CONSTRAINT "chk_relacion_oe_distinto"
CHECK ("origen_id" <> "destino_id");
