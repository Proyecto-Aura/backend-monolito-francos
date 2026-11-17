-- CreateEnum
CREATE TYPE "commerce"."tipo_movimiento_insumo_enum" AS ENUM ('entrada', 'salida', 'ajuste');

-- CreateTable
CREATE TABLE "commerce"."movimiento_insumo" (
    "id" SERIAL NOT NULL,
    "lote_insumo_id" INTEGER NOT NULL,
    "tipo" "commerce"."tipo_movimiento_insumo_enum" NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "stock_anterior" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock_resultante" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "razon" VARCHAR(255) NOT NULL,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_movimiento_insumo" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "commerce"."movimiento_insumo" ADD CONSTRAINT "fk_movimiento_insumo_lote" FOREIGN KEY ("lote_insumo_id") REFERENCES "commerce"."lote_insumo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateIndex (filtro frecuente: historial de movimientos de un lote/insumo)
CREATE INDEX "idx_movimiento_insumo_lote" ON "commerce"."movimiento_insumo"("lote_insumo_id");

-- Trigger: aplica cada movimiento al lote correspondiente. Antes de insertar
-- la fila, calcula stock_anterior/stock_resultante a partir del
-- cantidad_actual real del lote (con FOR UPDATE para serializar movimientos
-- concurrentes sobre el mismo lote), actualiza lote_insumo.cantidad_actual,
-- y si queda en 0 marca el lote como 'agotado'. Si el resultado sería
-- negativo, aborta el INSERT — última línea de defensa aunque la app ya
-- valide esto antes.
--
-- cantidad es siempre positiva para entrada/salida (la dirección la decide
-- "tipo"); para ajuste puede venir con signo (positivo suma, negativo resta).
--
-- Esto deja encadenado el trigger existente trg_recalcular_stock_insumo:
-- al tocar lote_insumo.cantidad_actual acá, ese trigger se dispara solo y
-- recalcula insumo.stock_actual, sin que este trigger tenga que saber nada
-- de insumo.
CREATE OR REPLACE FUNCTION commerce.aplicar_movimiento_insumo()
RETURNS TRIGGER AS $$
DECLARE
  v_cantidad_actual DECIMAL(10,2);
  v_delta DECIMAL(10,2);
  v_resultante DECIMAL(10,2);
BEGIN
  SELECT cantidad_actual INTO v_cantidad_actual
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aplicar_movimiento_insumo
BEFORE INSERT ON commerce.movimiento_insumo
FOR EACH ROW
EXECUTE FUNCTION commerce.aplicar_movimiento_insumo();
