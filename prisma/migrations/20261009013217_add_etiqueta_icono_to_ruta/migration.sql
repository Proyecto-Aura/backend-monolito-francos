/*
  Warnings:

  - Added the required column `etiqueta` to the `ruta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `icono` to the `ruta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ruta" ADD COLUMN     "etiqueta" VARCHAR(150) NOT NULL,
ADD COLUMN     "icono" VARCHAR(50) NOT NULL;
