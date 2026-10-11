-- La imagen deja de ser una URL libre: se guarda solo la key dentro de francos-media.
ALTER TABLE "producto_presentacion" DROP COLUMN "imagen_url",
ADD COLUMN "imagen_key" VARCHAR(255);
