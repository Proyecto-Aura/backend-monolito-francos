-- Evita que el mismo producto tenga dos veces la misma presentación.
CREATE UNIQUE INDEX "uq_producto_presentacion_producto_presentacion"
ON "producto_presentacion"("producto_id", "presentacion_id");

-- "Arroz", "arroz" y " Arroz " representan el mismo nombre comercial.
CREATE UNIQUE INDEX "uq_producto_nombre_normalizado"
ON "producto" (LOWER(BTRIM("nombre")));
