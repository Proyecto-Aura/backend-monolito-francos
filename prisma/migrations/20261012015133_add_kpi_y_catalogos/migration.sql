-- CreateTable
CREATE TABLE "unidad_medida_kpi" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "simbolo" VARCHAR(10) NOT NULL,
    "decimales" SMALLINT NOT NULL DEFAULT 2,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_unidad_medida_kpi" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frecuencia_medicion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "periodos_por_anio" SMALLINT NOT NULL,
    "orden" SMALLINT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_frecuencia_medicion" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodo" (
    "id" SERIAL NOT NULL,
    "frecuencia_id" INTEGER NOT NULL,
    "numero" SMALLINT NOT NULL,
    "codigo" VARCHAR(5) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "mes_fin" SMALLINT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_periodo" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "objetivo_estrategico_id" INTEGER NOT NULL,
    "frecuencia_id" INTEGER NOT NULL,
    "unidad_medida_id" INTEGER NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "formula" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_kpi" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semaforo_config" (
    "id" SERIAL NOT NULL,
    "kpi_id" INTEGER NOT NULL,
    "anio" SMALLINT NOT NULL,
    "color" VARCHAR(10) NOT NULL,
    "color_hex" VARCHAR(7) NOT NULL,
    "operador" VARCHAR(2) NOT NULL,
    "valor_referencia" DECIMAL(12,2) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_semaforo_config" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_meta_anual" (
    "id" SERIAL NOT NULL,
    "kpi_id" INTEGER NOT NULL,
    "anio" SMALLINT NOT NULL,
    "meta" DECIMAL(12,2) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_kpi_meta_anual" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_valor" (
    "id" SERIAL NOT NULL,
    "kpi_id" INTEGER NOT NULL,
    "anio" SMALLINT NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "semaforo_color" VARCHAR(10) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_kpi_valor" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidad_medida_kpi_nombre_key" ON "unidad_medida_kpi"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "frecuencia_medicion_nombre_key" ON "frecuencia_medicion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "periodo_codigo_key" ON "periodo"("codigo");

-- AddForeignKey
ALTER TABLE "periodo" ADD CONSTRAINT "fk_periodo_frecuencia" FOREIGN KEY ("frecuencia_id") REFERENCES "frecuencia_medicion"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpi" ADD CONSTRAINT "fk_kpi_objetivo" FOREIGN KEY ("objetivo_estrategico_id") REFERENCES "objetivo_estrategico"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpi" ADD CONSTRAINT "fk_kpi_frecuencia" FOREIGN KEY ("frecuencia_id") REFERENCES "frecuencia_medicion"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpi" ADD CONSTRAINT "fk_kpi_unidad" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida_kpi"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "semaforo_config" ADD CONSTRAINT "fk_semaforo_kpi" FOREIGN KEY ("kpi_id") REFERENCES "kpi"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpi_meta_anual" ADD CONSTRAINT "fk_meta_anual_kpi" FOREIGN KEY ("kpi_id") REFERENCES "kpi"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpi_valor" ADD CONSTRAINT "fk_valor_kpi" FOREIGN KEY ("kpi_id") REFERENCES "kpi"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kpi_valor" ADD CONSTRAINT "fk_valor_periodo" FOREIGN KEY ("periodo_id") REFERENCES "periodo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
