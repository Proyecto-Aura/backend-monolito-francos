-- HU-B-010 (RF-B30): boleta o factura de un pago del portal del cliente.

-- CreateTable
CREATE TABLE "commerce"."comprobante" (
    "id" SERIAL NOT NULL,
    "pago_id" INTEGER NOT NULL,
    "serie_comprobante_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "ruc" CHAR(11),
    "razon_social" VARCHAR(200),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_comprobante" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_comprobante_pago" ON "commerce"."comprobante"("pago_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_comprobante_serie_numero" ON "commerce"."comprobante"("serie_comprobante_id", "numero");

-- AddForeignKey
ALTER TABLE "commerce"."comprobante" ADD CONSTRAINT "fk_comprobante_pago" FOREIGN KEY ("pago_id") REFERENCES "commerce"."pago"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."comprobante" ADD CONSTRAINT "fk_comprobante_serie_comprobante" FOREIGN KEY ("serie_comprobante_id") REFERENCES "commerce"."serie_comprobante"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Prisma no modela CHECK: se añaden a mano.
-- Factura con RUC y razón social; boleta sin ninguno de los dos.
ALTER TABLE "commerce"."comprobante"
ADD CONSTRAINT "ck_comprobante_datos_factura"
CHECK (("ruc" IS NULL) = ("razon_social" IS NULL));

-- Correlativo SUNAT: de 1 a 99999999, como el rango de la serie.
ALTER TABLE "commerce"."comprobante"
ADD CONSTRAINT "ck_comprobante_numero"
CHECK ("numero" BETWEEN 1 AND 99999999);

ALTER TABLE "commerce"."comprobante"
ADD CONSTRAINT "ck_comprobante_montos"
CHECK ("subtotal" >= 0 AND "total" >= 0);
