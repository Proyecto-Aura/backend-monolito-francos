-- CreateEnum
CREATE TYPE "commerce"."unidad_medida_insumo_enum" AS ENUM ('kg', 'litros', 'unidad');

-- CreateEnum
CREATE TYPE "commerce"."tipo_insumo_enum" AS ENUM ('materia_prima', 'empaque');

-- CreateTable
CREATE TABLE "commerce"."insumo" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "unidad_medida" "commerce"."unidad_medida_insumo_enum" NOT NULL,
    "stock_actual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock_minimo" DECIMAL(10,2) NOT NULL,
    "tipo" "commerce"."tipo_insumo_enum" NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_insumo" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_insumo_sku" ON "commerce"."insumo"("sku");
