/*
  Warnings:

  - Changed the type of `tipo` on the `promocion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "tipo_promocion" AS ENUM ('porcentaje', 'monto_fijo', 'nxm', 'regalo');

-- AlterTable
ALTER TABLE "promocion" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "tipo_promocion" NOT NULL;
