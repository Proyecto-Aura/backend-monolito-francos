-- HU-B-014: el motivo y la descripción de la solicitud de reembolso se guardan
-- por separado. `motivo_cliente` (texto unido) se conserva para el portal de la
-- empresa.
ALTER TABLE "commerce"."reembolso"
  ADD COLUMN "motivo" VARCHAR(150),
  ADD COLUMN "descripcion" TEXT;

-- Solicitudes ya registradas: el texto unido es "<motivo>: <descripcion>". Se
-- parte en el primer ": "; si no lo tiene, todo es el motivo.
UPDATE "commerce"."reembolso"
SET
  "motivo" = LEFT(
    CASE
      WHEN STRPOS("motivo_cliente", ': ') > 0
        THEN SUBSTR("motivo_cliente", 1, STRPOS("motivo_cliente", ': ') - 1)
      ELSE "motivo_cliente"
    END,
    150
  ),
  "descripcion" = CASE
    WHEN STRPOS("motivo_cliente", ': ') > 0
      THEN SUBSTR("motivo_cliente", STRPOS("motivo_cliente", ': ') + 2)
    ELSE NULL
  END
WHERE "motivo" IS NULL;
