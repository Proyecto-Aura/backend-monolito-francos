-- CreateEnum
CREATE TYPE "commerce"."estado_lote_insumo_enum" AS ENUM ('activo', 'agotado', 'vencido');

-- CreateTable
CREATE TABLE "commerce"."lote_insumo" (
    "id" SERIAL NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "codigo_lote" VARCHAR(50) NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "fecha_vencimiento" DATE,
    "cantidad_inicial" DECIMAL(10,2) NOT NULL,
    "cantidad_actual" DECIMAL(10,2) NOT NULL,
    "estado" "commerce"."estado_lote_insumo_enum" NOT NULL DEFAULT 'activo',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_lote_insumo" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_lote_insumo_codigo" ON "commerce"."lote_insumo"("codigo_lote");

-- AddForeignKey
ALTER TABLE "commerce"."lote_insumo" ADD CONSTRAINT "fk_lote_insumo_insumo" FOREIGN KEY ("insumo_id") REFERENCES "commerce"."insumo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
