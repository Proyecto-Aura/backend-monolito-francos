-- CreateTable
CREATE TABLE "estado_plan_estrategico" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "orden" SMALLINT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_estado_plan_estrategico" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_estrategico" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "anio_inicio" SMALLINT NOT NULL,
    "anio_fin" SMALLINT NOT NULL,
    "estado_plan_id" INTEGER NOT NULL DEFAULT 1,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_plan_estrategico" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_estado_plan_codigo" ON "estado_plan_estrategico"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_estado_plan_orden" ON "estado_plan_estrategico"("orden");

-- AddForeignKey
ALTER TABLE "plan_estrategico" ADD CONSTRAINT "fk_plan_estrategico_estado" FOREIGN KEY ("estado_plan_id") REFERENCES "estado_plan_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
