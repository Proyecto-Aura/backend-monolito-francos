-- Código único legible por movimiento: FR-MV-[000]-[YYMMDD]-INS{insumoID}.
-- [000] es un correlativo que se reinicia cada día, por insumo (no por lote:
-- un insumo con varios lotes comparte el mismo contador).
ALTER TABLE "commerce"."movimiento_insumo" ADD COLUMN "codigo" VARCHAR(40);

-- Contador auxiliar: una fila por (insumo, día). Se actualiza con un UPSERT
-- atómico dentro del trigger de abajo, así que dos movimientos del mismo
-- insumo insertados al mismo tiempo (aunque sean de lotes distintos) nunca
-- reciben el mismo correlativo.
CREATE TABLE "commerce"."movimiento_insumo_correlativo" (
    "insumo_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "correlativo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_movimiento_insumo_correlativo" PRIMARY KEY ("insumo_id", "fecha")
);

-- Se extiende la función existente: la lógica de stock_anterior/
-- stock_resultante/cantidad_actual/agotado NO cambia (ver migración
-- 20261018043818_add_movimiento_insumo), solo se agrega la generación del
-- código. Para eso hace falta el insumo_id del lote, así que el SELECT
-- inicial (que ya hacía FOR UPDATE sobre el lote) ahora también lo trae.
CREATE OR REPLACE FUNCTION commerce.aplicar_movimiento_insumo()
RETURNS TRIGGER AS $$
DECLARE
  v_cantidad_actual DECIMAL(10,2);
  v_insumo_id INTEGER;
  v_delta DECIMAL(10,2);
  v_resultante DECIMAL(10,2);
  v_correlativo INTEGER;
BEGIN
  SELECT cantidad_actual, insumo_id INTO v_cantidad_actual, v_insumo_id
  FROM commerce.lote_insumo
  WHERE id = NEW.lote_insumo_id
  FOR UPDATE;

  IF v_cantidad_actual IS NULL THEN
    RAISE EXCEPTION 'Lote de insumo % no encontrado', NEW.lote_insumo_id;
  END IF;

  IF NEW.tipo = 'entrada' THEN
    v_delta := NEW.cantidad;
  ELSIF NEW.tipo = 'salida' THEN
    v_delta := -NEW.cantidad;
  ELSE
    v_delta := NEW.cantidad;
  END IF;

  v_resultante := v_cantidad_actual + v_delta;

  IF v_resultante < 0 THEN
    RAISE EXCEPTION 'El movimiento dejaría el lote % con stock negativo (actual=%, delta=%)',
      NEW.lote_insumo_id, v_cantidad_actual, v_delta;
  END IF;

  NEW.stock_anterior := v_cantidad_actual;
  NEW.stock_resultante := v_resultante;

  UPDATE commerce.lote_insumo
  SET cantidad_actual = v_resultante,
      estado = CASE
        WHEN v_resultante = 0 THEN 'agotado'::commerce.estado_lote_insumo_enum
        ELSE estado
      END
  WHERE id = NEW.lote_insumo_id;

  -- Correlativo diario por insumo: nace en 1 si es el primer movimiento del
  -- insumo hoy, o se incrementa atómicamente si ya había uno.
  INSERT INTO commerce.movimiento_insumo_correlativo (insumo_id, fecha, correlativo)
  VALUES (v_insumo_id, CURRENT_DATE, 1)
  ON CONFLICT (insumo_id, fecha)
  DO UPDATE SET correlativo = commerce.movimiento_insumo_correlativo.correlativo + 1
  RETURNING correlativo INTO v_correlativo;

  NEW.codigo := 'FR-MV-' || LPAD(v_correlativo::TEXT, 3, '0') || '-'
    || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-INS' || v_insumo_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger en sí no cambia (sigue siendo BEFORE INSERT, misma función);
-- solo quedó reforzado por el CREATE OR REPLACE de arriba.

ALTER TABLE "commerce"."movimiento_insumo" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX "uq_movimiento_insumo_codigo" ON "commerce"."movimiento_insumo"("codigo");
