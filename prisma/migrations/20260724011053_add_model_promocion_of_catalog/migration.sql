-- CreateTable
CREATE TABLE "promocion" (
    "id" SERIAL NOT NULL,
    "producto_presentacion_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "cantidad_paga" INTEGER,
    "cantidad_lleva" INTEGER,
    "cantidad_minima" INTEGER,
    "producto_presentacion_regalo_id" INTEGER,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_promocion" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "promocion" ADD CONSTRAINT "fk_promocion_producto_presentacion" FOREIGN KEY ("producto_presentacion_id") REFERENCES "producto_presentacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promocion" ADD CONSTRAINT "fk_promocion_regalo" FOREIGN KEY ("producto_presentacion_regalo_id") REFERENCES "producto_presentacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
