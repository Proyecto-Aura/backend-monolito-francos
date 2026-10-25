/*
  Warnings:

  - Made the column `stock_maximo` on table `insumo` required. This step will fail if there are existing NULL values in that column.

*/

-- Backfill: antes de este cambio stock_maximo era opcional y varias filas lo
-- tienen en NULL. Les asignamos 10x su stock_minimo (siempre >= stock_actual
-- en los datos actuales) para no romper la restricción NOT NULL de abajo.
UPDATE "commerce"."insumo" SET "stock_maximo" = "stock_minimo" * 10 WHERE "stock_maximo" IS NULL;

-- AlterTable
ALTER TABLE "commerce"."insumo" ALTER COLUMN "stock_maximo" SET NOT NULL;
