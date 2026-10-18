-- CreateEnum
CREATE TYPE "commerce"."origen_pedido_enum" AS ENUM ('portal', 'manual');

-- CreateEnum
CREATE TYPE "commerce"."estado_pedido_enum" AS ENUM ('confirmado', 'en_espera_inventario', 'en_preparacion', 'pendiente_entrega', 'en_camino', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "commerce"."tipo_entrega_enum" AS ENUM ('recojo_tienda', 'delivery');

-- CreateEnum
CREATE TYPE "commerce"."metodo_pago_enum" AS ENUM ('efectivo', 'culqi');

-- CreateTable
CREATE TABLE "commerce"."pedido" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "cliente_id" UUID NOT NULL,
    "user_id" UUID,
    "origen" "commerce"."origen_pedido_enum" NOT NULL,
    "estado" "commerce"."estado_pedido_enum" NOT NULL DEFAULT 'confirmado',
    "tipo_entrega" "commerce"."tipo_entrega_enum" NOT NULL,
    "direccion_entrega" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_pedido" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."detalle_pedido" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "producto_presentacion_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "precio_aplicado" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_detalle_pedido" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."pago" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "metodo_pago" "commerce"."metodo_pago_enum" NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "numero_operacion" VARCHAR(100),
    "fecha_pago" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_pago" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_pedido_codigo" ON "commerce"."pedido"("codigo");

-- CreateIndex
CREATE INDEX "idx_pedido_created_at" ON "commerce"."pedido"("created_at");

-- CreateIndex
CREATE INDEX "idx_pedido_cliente" ON "commerce"."pedido"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_detalle_pedido_pedido_producto_presentacion" ON "commerce"."detalle_pedido"("pedido_id", "producto_presentacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pago_pedido" ON "commerce"."pago"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pago_numero_operacion" ON "commerce"."pago"("numero_operacion");

-- AddForeignKey
ALTER TABLE "commerce"."pedido" ADD CONSTRAINT "fk_pedido_cliente" FOREIGN KEY ("cliente_id") REFERENCES "persons"."cliente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."pedido" ADD CONSTRAINT "fk_pedido_user" FOREIGN KEY ("user_id") REFERENCES "persons"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."detalle_pedido" ADD CONSTRAINT "fk_detalle_pedido_pedido" FOREIGN KEY ("pedido_id") REFERENCES "commerce"."pedido"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."detalle_pedido" ADD CONSTRAINT "fk_detalle_pedido_producto_presentacion" FOREIGN KEY ("producto_presentacion_id") REFERENCES "commerce"."producto_presentacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commerce"."pago" ADD CONSTRAINT "fk_pago_pedido" FOREIGN KEY ("pedido_id") REFERENCES "commerce"."pedido"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

