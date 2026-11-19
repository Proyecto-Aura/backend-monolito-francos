-- "area" deja de ser un enum fijo: puede ser cualquier texto (ej. "gerencia"),
-- ya que no necesariamente corresponde a un rol predefinido del sistema.
ALTER TABLE "persons"."empleado" ALTER COLUMN "area" TYPE VARCHAR(100) USING "area"::text;

DROP TYPE "persons"."area_empleado_enum";
