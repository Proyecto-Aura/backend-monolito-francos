-- CreateTable
CREATE TABLE "estado_objetivo" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "orden" SMALLINT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_estado_objetivo" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_estado_objetivo_codigo" ON "estado_objetivo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_estado_objetivo_orden" ON "estado_objetivo"("orden");

-- El estado inicial debe existir antes de agregar la FK con default 1.
INSERT INTO "estado_objetivo" ("id", "codigo", "nombre", "orden")
VALUES (1, 'PENDIENTE', 'Pendiente', 1);

SELECT setval(
    pg_get_serial_sequence('estado_objetivo', 'id'),
    (SELECT MAX("id") FROM "estado_objetivo")
);

-- AlterTable
-- Los objetivos existentes quedan pendientes y sin responsable asignado.
ALTER TABLE "objetivo_estrategico"
ADD COLUMN "estado_objetivo_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "responsable" VARCHAR(200) NOT NULL DEFAULT 'Sin asignar';

ALTER TABLE "objetivo_estrategico"
ALTER COLUMN "responsable" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "objetivo_estrategico" ADD CONSTRAINT "fk_oe_estado_objetivo" FOREIGN KEY ("estado_objetivo_id") REFERENCES "estado_objetivo"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
