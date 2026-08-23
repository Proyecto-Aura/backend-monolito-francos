/*
  Warnings:

  - The `area` column on the `empleado` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "area_empleado_enum" AS ENUM ('ventas', 'almacen', 'produccion', 'administracion');

-- AlterTable
ALTER TABLE "empleado" DROP COLUMN "area",
ADD COLUMN     "area" "area_empleado_enum";
