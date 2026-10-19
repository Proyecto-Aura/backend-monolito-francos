-- CreateEnum
CREATE TYPE "commerce"."estado_reembolso_enum" AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');

-- AlterEnum
ALTER TYPE "persons"."tipo_evento_notificacion_enum" ADD VALUE 'reembolso_procesado';

-- CreateTable
CREATE TABLE "commerce"."reembolso" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "pago_id" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "motivo_cliente" TEXT NOT NULL,
    "evidencia_key" VARCHAR(255),
    "estado" "commerce"."estado_reembolso_enum" NOT NULL DEFAULT 'pendiente',
    "motivo_rechazo" TEXT,
    "resuelto_por" UUID,
    "fecha_solicitud" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_resolucion" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_reembolso" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_reembolso_codigo" ON "commerce"."reembolso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_reembolso_pago" ON "commerce"."reembolso"("pago_id");

-- CreateIndex
CREATE INDEX "idx_reembolso_estado" ON "commerce"."reembolso"("estado");

-- CreateIndex
CREATE INDEX "idx_reembolso_fecha_solicitud" ON "commerce"."reembolso"("fecha_solicitud");

-- AddForeignKey
ALTER TABLE "commerce"."reembolso" ADD CONSTRAINT "fk_reembolso_pago" FOREIGN KEY ("pago_id") REFERENCES "commerce"."pago"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."reembolso" ADD CONSTRAINT "fk_reembolso_resuelto_por" FOREIGN KEY ("resuelto_por") REFERENCES "persons"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
