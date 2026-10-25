/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `cliente` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "persons"."cliente" ADD COLUMN     "codigo" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "persons"."persona" ADD COLUMN     "distrito_id" CHAR(6);

-- CreateTable
CREATE TABLE "persons"."departamento" (
    "id" CHAR(2) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "pk_departamento" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons"."provincia" (
    "id" CHAR(4) NOT NULL,
    "departamento_id" CHAR(2) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "pk_provincia" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons"."distrito" (
    "id" CHAR(6) NOT NULL,
    "provincia_id" CHAR(4) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,

    CONSTRAINT "pk_distrito" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_departamento_nombre" ON "persons"."departamento"("nombre");

-- CreateIndex
CREATE INDEX "idx_provincia_departamento_id" ON "persons"."provincia"("departamento_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_provincia_departamento_nombre" ON "persons"."provincia"("departamento_id", "nombre");

-- CreateIndex
CREATE INDEX "idx_distrito_provincia_id" ON "persons"."distrito"("provincia_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_distrito_provincia_nombre" ON "persons"."distrito"("provincia_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cliente_codigo" ON "persons"."cliente"("codigo");

-- CreateIndex
CREATE INDEX "idx_persona_distrito_id" ON "persons"."persona"("distrito_id");

-- AddForeignKey
ALTER TABLE "persons"."persona" ADD CONSTRAINT "fk_persona_distrito" FOREIGN KEY ("distrito_id") REFERENCES "persons"."distrito"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "persons"."provincia" ADD CONSTRAINT "fk_provincia_departamento" FOREIGN KEY ("departamento_id") REFERENCES "persons"."departamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "persons"."distrito" ADD CONSTRAINT "fk_distrito_provincia" FOREIGN KEY ("provincia_id") REFERENCES "persons"."provincia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
