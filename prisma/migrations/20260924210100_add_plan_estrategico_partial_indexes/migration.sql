-- Solo un plan puede estar ACTIVO (estado_plan_id = 2) a la vez.
CREATE UNIQUE INDEX "uq_plan_unico_activo"
ON "plan_estrategico" ("estado_plan_id")
WHERE "estado_plan_id" = 2 AND "estado" = true;

-- "Plan 2026", "plan 2026" y " Plan 2026 " son el mismo nombre para un plan vivo.
CREATE UNIQUE INDEX "uq_plan_nombre"
ON "plan_estrategico" (LOWER(BTRIM("nombre")))
WHERE "estado" = true;

-- El código correlativo (PE-0001...) debe ser único entre planes vivos.
CREATE UNIQUE INDEX "uq_plan_codigo"
ON "plan_estrategico" ("codigo")
WHERE "estado" = true;
