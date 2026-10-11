-- CreateTable
CREATE TABLE "documento_estrategico" (
    "id" SERIAL NOT NULL,
    "plan_estrategico_id" INTEGER NOT NULL,
    "tipo_modulo_id" INTEGER NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "nombre_original" VARCHAR(255),
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_documento_estrategico" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documento_estrategico" ADD CONSTRAINT "fk_doc_plan_estrategico" FOREIGN KEY ("plan_estrategico_id") REFERENCES "plan_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documento_estrategico" ADD CONSTRAINT "fk_doc_tipo_modulo" FOREIGN KEY ("tipo_modulo_id") REFERENCES "tipo_modulo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
