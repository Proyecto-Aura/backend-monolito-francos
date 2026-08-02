/*
  Warnings:

  - Changed the type of `tipo` on the `notificacion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "tipo_evento_notificacion_enum" AS ENUM ('pago_confirmado', 'pago_rechazado', 'pedido_en_camino', 'pedido_entregado', 'reembolso_aprobado', 'reembolso_rechazado', 'ticket_respondido', 'promocion', 'mantenimiento');

-- CreateEnum
CREATE TYPE "unidad_medida_presentacion_enum" AS ENUM ('kg', 'gr');

-- AlterTable
ALTER TABLE "notificacion" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "tipo_evento_notificacion_enum" NOT NULL,
ALTER COLUMN "referencia_id" SET DATA TYPE VARCHAR(50);

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_categoria" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" SERIAL NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_producto" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentacion" (
    "id" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "unidad_medida" "unidad_medida_presentacion_enum" NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_presentacion" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_presentacion" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "precio_mayorista" DECIMAL(10,2),
    "umbral_mayorista" INTEGER,
    "producto_id" INTEGER NOT NULL,
    "presentacion_id" INTEGER NOT NULL,
    "imagen_url" TEXT,
    "slug" VARCHAR(100),
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_producto_presentacion" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_producto_presentacion_sku" ON "producto_presentacion"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "uq_producto_presentacion_slug" ON "producto_presentacion"("slug");

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "fk_producto_categoria" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "producto_presentacion" ADD CONSTRAINT "fk_producto_presentacion_producto" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "producto_presentacion" ADD CONSTRAINT "fk_producto_presentacion_presentacion" FOREIGN KEY ("presentacion_id") REFERENCES "presentacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
