-- CreateTable
CREATE TABLE "strategic"."estado_iniciativa" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "orden" SMALLINT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_estado_iniciativa" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic"."iniciativa" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "objetivo_estrategico_id" INTEGER NOT NULL,
    "estado_iniciativa_id" INTEGER NOT NULL DEFAULT 1,
    "responsable" VARCHAR(200) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_iniciativa" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_estado_iniciativa_codigo" ON "strategic"."estado_iniciativa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_estado_iniciativa_orden" ON "strategic"."estado_iniciativa"("orden");

-- AddForeignKey
ALTER TABLE "strategic"."iniciativa" ADD CONSTRAINT "fk_iniciativa_objetivo" FOREIGN KEY ("objetivo_estrategico_id") REFERENCES "strategic"."objetivo_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "strategic"."iniciativa" ADD CONSTRAINT "fk_iniciativa_estado" FOREIGN KEY ("estado_iniciativa_id") REFERENCES "strategic"."estado_iniciativa"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
