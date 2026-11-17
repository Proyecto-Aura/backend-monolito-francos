-- CreateEnum
CREATE TYPE "commerce"."estado_solicitud_insumos_enum" AS ENUM ('pendiente', 'en_proceso', 'entregado', 'rechazado');

-- AlterTable
ALTER TABLE "commerce"."movimiento_insumo" ADD COLUMN     "solicitud_insumos_id" INTEGER;

-- CreateTable
CREATE TABLE "commerce"."solicitud_insumos" (
    "id" SERIAL NOT NULL,
    "codigo_solicitud" VARCHAR(50) NOT NULL,
    "solicitud_produccion_id" INTEGER,
    "estado" "commerce"."estado_solicitud_insumos_enum" NOT NULL DEFAULT 'pendiente',
    "fecha_creacion" DATE NOT NULL,
    "fecha_limite" DATE,
    "solicitado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_solicitud_insumos" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."solicitud_insumos_detalle" (
    "id" SERIAL NOT NULL,
    "solicitud_insumos_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "cantidad_solicitada" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_solicitud_insumos_detalle" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_solicitud_insumos_codigo" ON "commerce"."solicitud_insumos"("codigo_solicitud");

-- CreateIndex
CREATE INDEX "idx_solicitud_insumos_solicitado_por" ON "commerce"."solicitud_insumos"("solicitado_por");

-- CreateIndex
CREATE INDEX "idx_solicitud_insumos_solicitud_produccion" ON "commerce"."solicitud_insumos"("solicitud_produccion_id");

-- CreateIndex
CREATE INDEX "idx_solicitud_insumos_detalle_solicitud" ON "commerce"."solicitud_insumos_detalle"("solicitud_insumos_id");

-- CreateIndex
CREATE INDEX "idx_solicitud_insumos_detalle_insumo" ON "commerce"."solicitud_insumos_detalle"("insumo_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_solicitud_insumos_detalle_solicitud_insumo" ON "commerce"."solicitud_insumos_detalle"("solicitud_insumos_id", "insumo_id");

-- CreateIndex
CREATE INDEX "idx_movimiento_insumo_solicitud_insumos" ON "commerce"."movimiento_insumo"("solicitud_insumos_id");

-- AddForeignKey
ALTER TABLE "commerce"."movimiento_insumo" ADD CONSTRAINT "fk_movimiento_insumo_solicitud_insumos" FOREIGN KEY ("solicitud_insumos_id") REFERENCES "commerce"."solicitud_insumos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."solicitud_insumos" ADD CONSTRAINT "fk_solicitud_insumos_user" FOREIGN KEY ("solicitado_por") REFERENCES "persons"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."solicitud_insumos" ADD CONSTRAINT "fk_solicitud_insumos_solicitud_produccion" FOREIGN KEY ("solicitud_produccion_id") REFERENCES "commerce"."solicitud_produccion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."solicitud_insumos_detalle" ADD CONSTRAINT "fk_solicitud_insumos_detalle_solicitud" FOREIGN KEY ("solicitud_insumos_id") REFERENCES "commerce"."solicitud_insumos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."solicitud_insumos_detalle" ADD CONSTRAINT "fk_solicitud_insumos_detalle_insumo" FOREIGN KEY ("insumo_id") REFERENCES "commerce"."insumo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
