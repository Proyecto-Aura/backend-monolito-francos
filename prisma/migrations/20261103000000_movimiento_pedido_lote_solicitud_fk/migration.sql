-- AlterTable: traza qué pedido originó cada salida de producto terminado.
ALTER TABLE "commerce"."movimiento_producto_terminado" ADD COLUMN "pedido_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_movimiento_producto_terminado_pedido" ON "commerce"."movimiento_producto_terminado"("pedido_id");

-- AddForeignKey
ALTER TABLE "commerce"."movimiento_producto_terminado" ADD CONSTRAINT "fk_movimiento_producto_terminado_pedido" FOREIGN KEY ("pedido_id") REFERENCES "commerce"."pedido"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable: traza qué solicitud de producción cumple cada lote.
ALTER TABLE "commerce"."lote_producto_terminado" ADD COLUMN "solicitud_produccion_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_lote_producto_terminado_solicitud_produccion" ON "commerce"."lote_producto_terminado"("solicitud_produccion_id");

-- AddForeignKey
ALTER TABLE "commerce"."lote_producto_terminado" ADD CONSTRAINT "fk_lote_producto_terminado_solicitud_produccion" FOREIGN KEY ("solicitud_produccion_id") REFERENCES "commerce"."solicitud_produccion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
