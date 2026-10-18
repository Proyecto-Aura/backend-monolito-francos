-- AlterTable
ALTER TABLE "persons"."empresa" ADD COLUMN     "es_emisora" BOOLEAN NOT NULL DEFAULT false;


-- A lo sumo una empresa emisora de comprobantes (HU-A-039). Prisma no modela
-- índices parciales, por eso se añade a mano.
CREATE UNIQUE INDEX "uq_empresa_emisora"
ON "persons"."empresa" ("es_emisora")
WHERE "es_emisora" = true;
