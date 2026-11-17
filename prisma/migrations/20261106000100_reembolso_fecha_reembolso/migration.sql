-- HU-B-014 (RF-B41): fecha en que se confirmó la devolución. Las solicitudes ya
-- reembolsadas quedan en NULL: no hay registro de cuándo se devolvió y no se
-- deduce de updated_at.
ALTER TABLE "commerce"."reembolso"
  ADD COLUMN "fecha_reembolso" TIMESTAMPTZ(6);
