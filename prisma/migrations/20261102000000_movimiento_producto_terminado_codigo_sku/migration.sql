-- El código de movimiento de producto terminado usaba el id numérico interno
-- (FR-MV-[seq]-[YYMMDD]-PT{producto_terminado_id}). Ahora usa el sku de la
-- producto_presentación sin su propio prefijo "FR-" (el código del
-- movimiento ya empieza con "FR-MV-", así que se recorta para no duplicarlo):
-- FR-MV-[seq]-[YYMMDD]-{sku sin "FR-"}. El sku es 1:1 único con
-- producto_terminado_id (FK @unique), así que la unicidad del código no
-- cambia aunque se le saque el prefijo.

CREATE OR REPLACE FUNCTION commerce.aplicar_movimiento_producto_terminado()
RETURNS TRIGGER AS $$
DECLARE
  v_cantidad_actual DECIMAL(10,2);
  v_producto_terminado_id INTEGER;
  v_sku VARCHAR(100);
  v_delta DECIMAL(10,2);
  v_resultante DECIMAL(10,2);
  v_correlativo INTEGER;
BEGIN
  SELECT cantidad_actual, producto_terminado_id INTO v_cantidad_actual, v_producto_terminado_id
  FROM commerce.lote_producto_terminado
  WHERE id = NEW.lote_producto_terminado_id
  FOR UPDATE;

  IF v_cantidad_actual IS NULL THEN
    RAISE EXCEPTION 'Lote de producto terminado % no encontrado', NEW.lote_producto_terminado_id;
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
      NEW.lote_producto_terminado_id, v_cantidad_actual, v_delta;
  END IF;

  NEW.stock_anterior := v_cantidad_actual;
  NEW.stock_resultante := v_resultante;

  UPDATE commerce.lote_producto_terminado
  SET cantidad_actual = v_resultante,
      estado = CASE
        WHEN v_resultante = 0 THEN 'agotado'::commerce.estado_lote_producto_terminado_enum
        ELSE estado
      END
  WHERE id = NEW.lote_producto_terminado_id;

  -- Correlativo diario por producto terminado: nace en 1 si es el primer
  -- movimiento del producto hoy, o se incrementa atómicamente si ya había uno.
  INSERT INTO commerce.movimiento_producto_terminado_correlativo (producto_terminado_id, fecha, correlativo)
  VALUES (v_producto_terminado_id, CURRENT_DATE, 1)
  ON CONFLICT (producto_terminado_id, fecha)
  DO UPDATE SET correlativo = commerce.movimiento_producto_terminado_correlativo.correlativo + 1
  RETURNING correlativo INTO v_correlativo;

  SELECT regexp_replace(pp.sku, '^FR-', '') INTO v_sku
  FROM commerce.producto_terminado pt
  JOIN commerce.producto_presentacion pp ON pp.id = pt.producto_presentacion_id
  WHERE pt.id = v_producto_terminado_id;

  NEW.codigo := 'FR-MV-' || LPAD(v_correlativo::TEXT, 3, '0') || '-'
    || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || v_sku;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill: los movimientos ya existentes se quedarían con el formato viejo
-- para siempre si no se actualizan acá (el trigger es BEFORE INSERT, no
-- toca filas existentes). Solo se reemplaza el sufijo "-PT{id}" por el sku
-- (sin su propio prefijo "FR-"); correlativo y fecha del código quedan
-- intactos.
UPDATE commerce.movimiento_producto_terminado m
SET codigo = regexp_replace(m.codigo, '-PT\d+$', '-' || regexp_replace(pp.sku, '^FR-', ''))
FROM commerce.lote_producto_terminado l
JOIN commerce.producto_terminado pt ON pt.id = l.producto_terminado_id
JOIN commerce.producto_presentacion pp ON pp.id = pt.producto_presentacion_id
WHERE m.lote_producto_terminado_id = l.id
  AND m.codigo ~ '-PT\d+$';
