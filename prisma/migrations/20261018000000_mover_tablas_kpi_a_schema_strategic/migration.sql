-- Las tablas de KPI (OFT0-429) se crearon en "public" antes de que develop separara el
-- resto del módulo strategic a su propio schema (ver migración
-- 20261015120000_separar_por_schemas). Usa ALTER ... SET SCHEMA (no DROP + CREATE) para
-- no perder datos; Postgres mueve automáticamente índices, constraints y secuencias
-- asociadas junto con cada tabla.

ALTER TABLE "public"."unidad_medida_kpi" SET SCHEMA "strategic";
ALTER TABLE "public"."frecuencia_medicion" SET SCHEMA "strategic";
ALTER TABLE "public"."periodo" SET SCHEMA "strategic";
ALTER TABLE "public"."kpi" SET SCHEMA "strategic";
ALTER TABLE "public"."semaforo_config" SET SCHEMA "strategic";
ALTER TABLE "public"."kpi_meta_anual" SET SCHEMA "strategic";
ALTER TABLE "public"."kpi_valor" SET SCHEMA "strategic";
