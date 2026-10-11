-- CreateTable
CREATE TABLE "perspectiva_bsc" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "orden" SMALLINT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_perspectiva_bsc" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_modulo" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_tipo_modulo" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objetivo_estrategico" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "plan_estrategico_id" INTEGER NOT NULL,
    "perspectiva_bsc_id" INTEGER NOT NULL,
    "tipo_modulo_id" INTEGER NOT NULL,
    "oe_negocio_id" INTEGER,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_objetivo_estrategico" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relacion_oe" (
    "id" SERIAL NOT NULL,
    "origen_id" INTEGER NOT NULL,
    "destino_id" INTEGER NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_relacion_oe" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_perspectiva_nombre" ON "perspectiva_bsc"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tipo_modulo_codigo" ON "tipo_modulo"("codigo");

-- AddForeignKey
ALTER TABLE "objetivo_estrategico" ADD CONSTRAINT "fk_oe_plan_estrategico" FOREIGN KEY ("plan_estrategico_id") REFERENCES "plan_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "objetivo_estrategico" ADD CONSTRAINT "fk_oe_perspectiva_bsc" FOREIGN KEY ("perspectiva_bsc_id") REFERENCES "perspectiva_bsc"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "objetivo_estrategico" ADD CONSTRAINT "fk_oe_tipo_modulo" FOREIGN KEY ("tipo_modulo_id") REFERENCES "tipo_modulo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "objetivo_estrategico" ADD CONSTRAINT "fk_oe_negocio" FOREIGN KEY ("oe_negocio_id") REFERENCES "objetivo_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "relacion_oe" ADD CONSTRAINT "fk_relacion_oe_origen" FOREIGN KEY ("origen_id") REFERENCES "objetivo_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "relacion_oe" ADD CONSTRAINT "fk_relacion_oe_destino" FOREIGN KEY ("destino_id") REFERENCES "objetivo_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
