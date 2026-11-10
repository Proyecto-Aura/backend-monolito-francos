-- HU-B-019: el cliente decide si recibe el aviso de pedido en camino. Las cuentas
-- existentes quedan activas, que es el comportamiento que ya tenían.
ALTER TABLE "persons"."user"
  ADD COLUMN "notificar_pedido_en_camino" BOOLEAN NOT NULL DEFAULT true;
