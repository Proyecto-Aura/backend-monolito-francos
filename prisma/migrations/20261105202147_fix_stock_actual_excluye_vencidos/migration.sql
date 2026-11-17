-- stock_actual de insumo y producto_terminado se recalculaba sumando todos
-- los lotes con estado='activo' AND activo=true, sin excluir los vencidos
-- ('vencido' no es un valor guardado en estado: se calcula al leer, comparando
-- fecha_vencimiento). Resultado: un lote ya vencido seguía sumando a
-- stock_actual aunque no sea despachable (el FEFO de salidas ya lo excluía
-- correctamente vía findDisponiblesParaSalida, por eso el stock mostrado no
-- coincidía con lo realmente disponible para entregar).

CREATE OR REPLACE FUNCTION commerce.recalcular_stock_insumo()
RETURNS TRIGGER AS $$
DECLARE
  v_insumo_id INTEGER;
BEGIN
  v_insumo_id := COALESCE(NEW.insumo_id, OLD.insumo_id);

  UPDATE commerce.insumo
  SET stock_actual = COALESCE((
    SELECT SUM(cantidad_actual)
    FROM commerce.lote_insumo
    WHERE insumo_id = v_insumo_id
      AND estado = 'activo'
      AND activo = true
      AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
  ), 0)
  WHERE id = v_insumo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION commerce.recalcular_stock_producto_terminado()
RETURNS TRIGGER AS $$
DECLARE
  v_producto_terminado_id INTEGER;
BEGIN
  v_producto_terminado_id := COALESCE(NEW.producto_terminado_id, OLD.producto_terminado_id);

  UPDATE commerce.producto_terminado
  SET stock_actual = COALESCE((
    SELECT SUM(cantidad_actual)
    FROM commerce.lote_producto_terminado
    WHERE producto_terminado_id = v_producto_terminado_id
      AND estado = 'activo'
      AND activo = true
      AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
  ), 0)
  WHERE id = v_producto_terminado_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Reparación única: corrige los valores que ya quedaron desincronizados
-- (sumando lotes vencidos) antes de que existiera este filtro.
UPDATE commerce.insumo i
SET stock_actual = COALESCE((
  SELECT SUM(l.cantidad_actual)
  FROM commerce.lote_insumo l
  WHERE l.insumo_id = i.id
    AND l.estado = 'activo'
    AND l.activo = true
    AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
), 0);

UPDATE commerce.producto_terminado p
SET stock_actual = COALESCE((
  SELECT SUM(l.cantidad_actual)
  FROM commerce.lote_producto_terminado l
  WHERE l.producto_terminado_id = p.id
    AND l.estado = 'activo'
    AND l.activo = true
    AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
), 0);
