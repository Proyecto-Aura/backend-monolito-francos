-- Separa las tablas de "public" en 3 schemas de dominio: persons, commerce, strategic.
-- Usa ALTER ... SET SCHEMA (no DROP + CREATE) para no perder datos. Postgres mueve
-- automáticamente índices, constraints y secuencias asociadas (identity/serial) junto
-- con cada tabla.

CREATE SCHEMA IF NOT EXISTS "persons";
CREATE SCHEMA IF NOT EXISTS "commerce";
CREATE SCHEMA IF NOT EXISTS "strategic";

-- Enums -> persons
ALTER TYPE "public"."tipo_documento_enum" SET SCHEMA "persons";
ALTER TYPE "public"."tipo_cliente_enum" SET SCHEMA "persons";
ALTER TYPE "public"."categoria_cliente_enum" SET SCHEMA "persons";
ALTER TYPE "public"."referencia_tipo_enum" SET SCHEMA "persons";
ALTER TYPE "public"."area_empleado_enum" SET SCHEMA "persons";
ALTER TYPE "public"."tipo_evento_notificacion_enum" SET SCHEMA "persons";

-- Enums -> commerce
ALTER TYPE "public"."unidad_medida_presentacion_enum" SET SCHEMA "commerce";
ALTER TYPE "public"."tipo_promocion" SET SCHEMA "commerce";

-- Tablas -> persons
ALTER TABLE "public"."persona" SET SCHEMA "persons";
ALTER TABLE "public"."empleado" SET SCHEMA "persons";
ALTER TABLE "public"."cliente" SET SCHEMA "persons";
ALTER TABLE "public"."user" SET SCHEMA "persons";
ALTER TABLE "public"."refresh_token" SET SCHEMA "persons";
ALTER TABLE "public"."rol" SET SCHEMA "persons";
ALTER TABLE "public"."ruta" SET SCHEMA "persons";
ALTER TABLE "public"."acceso" SET SCHEMA "persons";
ALTER TABLE "public"."usuario_rol" SET SCHEMA "persons";
ALTER TABLE "public"."notificacion" SET SCHEMA "persons";
ALTER TABLE "public"."notificacion_user" SET SCHEMA "persons";
ALTER TABLE "public"."empresa" SET SCHEMA "persons";

-- Tablas -> commerce
ALTER TABLE "public"."categoria" SET SCHEMA "commerce";
ALTER TABLE "public"."producto" SET SCHEMA "commerce";
ALTER TABLE "public"."presentacion" SET SCHEMA "commerce";
ALTER TABLE "public"."producto_presentacion" SET SCHEMA "commerce";
ALTER TABLE "public"."promocion" SET SCHEMA "commerce";
ALTER TABLE "public"."producto_terminado" SET SCHEMA "commerce";

-- Tablas -> strategic
ALTER TABLE "public"."estado_plan_estrategico" SET SCHEMA "strategic";
ALTER TABLE "public"."plan_estrategico" SET SCHEMA "strategic";
ALTER TABLE "public"."perspectiva_bsc" SET SCHEMA "strategic";
ALTER TABLE "public"."tipo_modulo" SET SCHEMA "strategic";
ALTER TABLE "public"."estado_objetivo" SET SCHEMA "strategic";
ALTER TABLE "public"."objetivo_estrategico" SET SCHEMA "strategic";
ALTER TABLE "public"."relacion_oe" SET SCHEMA "strategic";
ALTER TABLE "public"."documento_estrategico" SET SCHEMA "strategic";
