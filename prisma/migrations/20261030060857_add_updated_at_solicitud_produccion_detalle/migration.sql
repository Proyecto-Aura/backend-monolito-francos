-- AlterTable
ALTER TABLE "commerce"."solicitud_produccion_detalle" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
