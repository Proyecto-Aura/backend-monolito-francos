-- CreateEnum
CREATE TYPE "commerce"."tipo_comprobante" AS ENUM ('boleta', 'factura');

-- CreateTable
CREATE TABLE "commerce"."serie_comprobante" (
    "id" SERIAL NOT NULL,
    "tipo" "commerce"."tipo_comprobante" NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo_inicio" INTEGER NOT NULL,
    "correlativo_fin" INTEGER NOT NULL,
    "correlativo_actual" INTEGER NOT NULL,
    "umbral_alerta" INTEGER NOT NULL DEFAULT 100,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_serie_comprobante" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_serie_comprobante_serie" ON "commerce"."serie_comprobante"("serie");


-- A lo sumo una serie activa por tipo de comprobante (HU-A-044). Prisma no modela
-- índices parciales, por eso se añade a mano.
CREATE UNIQUE INDEX "uq_serie_activa_por_tipo"
ON "commerce"."serie_comprobante" ("tipo")
WHERE "estado" = true;

-- Rango SUNAT: 1 <= inicio <= fin <= 99999999.
ALTER TABLE "commerce"."serie_comprobante"
ADD CONSTRAINT "ck_serie_comprobante_rango"
CHECK ("correlativo_inicio" >= 1
  AND "correlativo_inicio" <= "correlativo_fin"
  AND "correlativo_fin" <= 99999999);

-- El último emitido nunca sale del rango (inicio - 1 significa "aún no emitió").
ALTER TABLE "commerce"."serie_comprobante"
ADD CONSTRAINT "ck_serie_comprobante_actual"
CHECK ("correlativo_actual" >= "correlativo_inicio" - 1
  AND "correlativo_actual" <= "correlativo_fin");

ALTER TABLE "commerce"."serie_comprobante"
ADD CONSTRAINT "ck_serie_comprobante_umbral"
CHECK ("umbral_alerta" >= 0);
