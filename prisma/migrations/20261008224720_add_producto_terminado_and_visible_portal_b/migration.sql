-- AlterTable
ALTER TABLE "producto_presentacion" ADD COLUMN     "visible_portal_b" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "producto_terminado" (
    "id" SERIAL NOT NULL,
    "producto_presentacion_id" INTEGER NOT NULL,
    "stock_actual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock_minimo" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "stock_maximo" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_producto_terminado" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_producto_terminado_producto_presentacion" ON "producto_terminado"("producto_presentacion_id");

-- AddForeignKey
ALTER TABLE "producto_terminado" ADD CONSTRAINT "fk_producto_terminado_producto_presentacion" FOREIGN KEY ("producto_presentacion_id") REFERENCES "producto_presentacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Integridad del stock (Prisma no modela CHECK): sin negativos y, si hay máximo,
-- que no sea menor que el mínimo.
ALTER TABLE "producto_terminado"
    ADD CONSTRAINT "ck_producto_terminado_stock_actual" CHECK ("stock_actual" >= 0),
    ADD CONSTRAINT "ck_producto_terminado_stock_minimo" CHECK ("stock_minimo" >= 0),
    ADD CONSTRAINT "ck_producto_terminado_stock_maximo" CHECK ("stock_maximo" IS NULL OR "stock_maximo" >= "stock_minimo");
