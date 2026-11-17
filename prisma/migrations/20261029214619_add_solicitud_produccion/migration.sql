-- CreateEnum
CREATE TYPE "commerce"."estado_solicitud_produccion_enum" AS ENUM ('pendiente', 'en_proceso', 'entregado', 'rechazado');

-- CreateTable
CREATE TABLE "commerce"."solicitud_produccion" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "estado" "commerce"."estado_solicitud_produccion_enum" NOT NULL DEFAULT 'pendiente',
    "fecha_creacion" DATE NOT NULL,
    "fecha_limite" DATE,
    "solicitado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_solicitud_produccion" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."solicitud_produccion_detalle" (
    "id" SERIAL NOT NULL,
    "solicitud_produccion_id" INTEGER NOT NULL,
    "producto_terminado_id" INTEGER NOT NULL,
    "cantidad_solicitada" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_solicitud_produccion_detalle" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_solicitud_produccion_codigo" ON "commerce"."solicitud_produccion"("codigo");

-- CreateIndex
CREATE INDEX "idx_solicitud_produccion_solicitado_por" ON "commerce"."solicitud_produccion"("solicitado_por");

-- CreateIndex
CREATE INDEX "idx_solicitud_produccion_detalle_solicitud" ON "commerce"."solicitud_produccion_detalle"("solicitud_produccion_id");

-- CreateIndex
CREATE INDEX "idx_solicitud_produccion_detalle_producto_terminado" ON "commerce"."solicitud_produccion_detalle"("producto_terminado_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_solicitud_produccion_detalle_solicitud_producto" ON "commerce"."solicitud_produccion_detalle"("solicitud_produccion_id", "producto_terminado_id");

-- AddForeignKey
ALTER TABLE "commerce"."solicitud_produccion" ADD CONSTRAINT "fk_solicitud_produccion_user" FOREIGN KEY ("solicitado_por") REFERENCES "persons"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."solicitud_produccion_detalle" ADD CONSTRAINT "fk_solicitud_produccion_detalle_solicitud" FOREIGN KEY ("solicitud_produccion_id") REFERENCES "commerce"."solicitud_produccion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."solicitud_produccion_detalle" ADD CONSTRAINT "fk_solicitud_produccion_detalle_producto_terminado" FOREIGN KEY ("producto_terminado_id") REFERENCES "commerce"."producto_terminado"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
