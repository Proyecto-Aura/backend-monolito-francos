-- stock_actual de commerce.insumo pasa a ser un valor derivado: se recalcula
-- automáticamente como la suma de cantidad_actual de sus lotes activos
-- (estado='activo' AND activo=true) cada vez que se toca commerce.lote_insumo,
-- sin importar si el cambio viene de la API o de un UPDATE directo por SQL.
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
  ), 0)
  WHERE id = v_insumo_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_stock_insumo
AFTER INSERT OR UPDATE OR DELETE ON commerce.lote_insumo
FOR EACH ROW
EXECUTE FUNCTION commerce.recalcular_stock_insumo();

-- Reparación única: sincroniza los insumos que ya tenían lotes antes de que
-- existiera el trigger.
UPDATE commerce.insumo i
SET stock_actual = COALESCE((
  SELECT SUM(l.cantidad_actual)
  FROM commerce.lote_insumo l
  WHERE l.insumo_id = i.id
    AND l.estado = 'activo'
    AND l.activo = true
), 0);
