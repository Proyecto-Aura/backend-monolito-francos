-- Dos documentos con el mismo nombre en el mismo plan y módulo son indistinguibles en el listado.
CREATE UNIQUE INDEX "uq_doc_nombre"
ON "documento_estrategico" ("plan_estrategico_id", "tipo_modulo_id", LOWER(BTRIM("nombre")))
WHERE "estado" = true;

-- Filtro de los dos listados (RF-A100 / Negocio, y el futuro de TI).
CREATE INDEX "ix_doc_plan_tipo"
ON "documento_estrategico" ("plan_estrategico_id", "tipo_modulo_id")
WHERE "estado" = true;
