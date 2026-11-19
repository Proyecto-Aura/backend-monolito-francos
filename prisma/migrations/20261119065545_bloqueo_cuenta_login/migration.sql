-- Bloqueo temporal de cuenta tras varios logins fallidos seguidos (protección contra fuerza bruta).
-- AlterTable
ALTER TABLE "persons"."user" ADD COLUMN     "bloqueado_hasta" TIMESTAMPTZ(6),
ADD COLUMN     "intentos_fallidos" INTEGER NOT NULL DEFAULT 0;
