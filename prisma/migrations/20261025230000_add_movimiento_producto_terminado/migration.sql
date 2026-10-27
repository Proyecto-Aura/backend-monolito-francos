-- Kardex de producto terminado (OFT0-259), mismo patrón que insumos
-- (lote_insumo / movimiento_insumo): un lote por lote de producción, y cada
-- movimiento (entrada/salida/ajuste) recalcula el lote; un segundo trigger
-- ya existente en espíritu (igual al de insumo) recalcula el stock del
-- producto terminado a partir de sus lotes activos.

-- CreateEnum
CREATE TYPE "commerce"."estado_lote_producto_terminado_enum" AS ENUM ('activo', 'agotado', 'vencido');

-- CreateTable
CREATE TABLE "commerce"."lote_producto_terminado" (
    "id" SERIAL NOT NULL,
    "producto_terminado_id" INTEGER NOT NULL,
    "codigo_lote" VARCHAR(50) NOT NULL,
    "fecha_produccion" DATE NOT NULL,
    "fecha_vencimiento" DATE,
    "cantidad_inicial" DECIMAL(10,2) NOT NULL,
    "cantidad_actual" DECIMAL(10,2) NOT NULL,
    "estado" "commerce"."estado_lote_producto_terminado_enum" NOT NULL DEFAULT 'activo',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_lote_producto_terminado" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_lote_producto_terminado_codigo" ON "commerce"."lote_producto_terminado"("codigo_lote");

-- AddForeignKey
ALTER TABLE "commerce"."lote_producto_terminado" ADD CONSTRAINT "fk_lote_producto_terminado_producto_terminado" FOREIGN KEY ("producto_terminado_id") REFERENCES "commerce"."producto_terminado"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateEnum
CREATE TYPE "commerce"."tipo_movimiento_producto_terminado_enum" AS ENUM ('entrada', 'salida', 'ajuste');

-- CreateTable
-- Código único legible por movimiento: FR-MV-[000]-[YYMMDD]-PT{productoTerminadoID}.
-- [000] es un correlativo que se reinicia cada día, por producto terminado
-- (no por lote: un producto con varios lotes comparte el mismo contador).
CREATE TABLE "commerce"."movimiento_producto_terminado" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "lote_producto_terminado_id" INTEGER NOT NULL,
    "tipo" "commerce"."tipo_movimiento_producto_terminado_enum" NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "stock_anterior" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock_resultante" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "razon" VARCHAR(255) NOT NULL,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_movimiento_producto_terminado" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_movimiento_producto_terminado_codigo" ON "commerce"."movimiento_producto_terminado"("codigo");

-- CreateIndex (filtro frecuente: historial de movimientos de un lote/producto)
CREATE INDEX "idx_movimiento_producto_terminado_lote" ON "commerce"."movimiento_producto_terminado"("lote_producto_terminado_id");

-- AddForeignKey
ALTER TABLE "commerce"."movimiento_producto_terminado" ADD CONSTRAINT "fk_movimiento_producto_terminado_lote" FOREIGN KEY ("lote_producto_terminado_id") REFERENCES "commerce"."lote_producto_terminado"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable
-- Contador auxiliar: una fila por (producto_terminado, día). Se actualiza
-- con un UPSERT atómico dentro del trigger de abajo, así que dos movimientos
-- del mismo producto terminado insertados al mismo tiempo (aunque sean de
-- lotes distintos) nunca reciben el mismo correlativo.
CREATE TABLE "commerce"."movimiento_producto_terminado_correlativo" (
    "producto_terminado_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "correlativo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pk_movimiento_producto_terminado_correlativo" PRIMARY KEY ("producto_terminado_id", "fecha")
);

-- Trigger 1/2: recalcula producto_terminado.stock_actual como la suma de
-- cantidad_actual de sus lotes activos (estado='activo' AND activo=true)
-- cada vez que se toca commerce.lote_producto_terminado. Mismo patrón que
-- commerce.recalcular_stock_insumo.
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
  ), 0)
  WHERE id = v_producto_terminado_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_stock_producto_terminado
AFTER INSERT OR UPDATE OR DELETE ON commerce.lote_producto_terminado
FOR EACH ROW
EXECUTE FUNCTION commerce.recalcular_stock_producto_terminado();

-- Trigger 2/2: aplica cada movimiento al lote correspondiente. Antes de
-- insertar la fila, calcula stock_anterior/stock_resultante a partir del
-- cantidad_actual real del lote (con FOR UPDATE para serializar movimientos
-- concurrentes sobre el mismo lote), actualiza
-- lote_producto_terminado.cantidad_actual, y si queda en 0 marca el lote
-- como 'agotado'. Si el resultado sería negativo, aborta el INSERT — última
-- línea de defensa aunque la app ya valide esto antes. También genera el
-- código único (ver comentario de la tabla movimiento_producto_terminado).
--
-- cantidad es siempre positiva para entrada/salida (la dirección la decide
-- "tipo"); para ajuste puede venir con signo (positivo suma, negativo resta).
--
-- Esto deja encadenado trg_recalcular_stock_producto_terminado de arriba: al
-- tocar lote_producto_terminado.cantidad_actual acá, ese trigger se dispara
-- solo y recalcula producto_terminado.stock_actual, sin que este trigger
-- tenga que saber nada de producto_terminado.
CREATE OR REPLACE FUNCTION commerce.aplicar_movimiento_producto_terminado()
RETURNS TRIGGER AS $$
DECLARE
  v_cantidad_actual DECIMAL(10,2);
  v_producto_terminado_id INTEGER;
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

  NEW.codigo := 'FR-MV-' || LPAD(v_correlativo::TEXT, 3, '0') || '-'
    || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-PT' || v_producto_terminado_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aplicar_movimiento_producto_terminado
BEFORE INSERT ON commerce.movimiento_producto_terminado
FOR EACH ROW
EXECUTE FUNCTION commerce.aplicar_movimiento_producto_terminado();
