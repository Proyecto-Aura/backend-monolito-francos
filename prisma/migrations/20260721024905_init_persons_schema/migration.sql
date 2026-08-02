-- CreateEnum
CREATE TYPE "tipo_documento_enum" AS ENUM ('dni', 'ce', 'pasaporte', 'ruc');

-- CreateEnum
CREATE TYPE "tipo_cliente_enum" AS ENUM ('persona natural', 'empresa');

-- CreateEnum
CREATE TYPE "categoria_cliente_enum" AS ENUM ('minorista', 'mayorista');

-- CreateEnum
CREATE TYPE "referencia_tipo_enum" AS ENUM ('pedido', 'pago', 'reembolso', 'promocion');

-- CreateTable
CREATE TABLE "persona" (
    "id" UUID NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellido_paterno" VARCHAR(100) NOT NULL,
    "apellido_materno" VARCHAR(100) NOT NULL,
    "tipo_documento" "tipo_documento_enum" NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(9),
    "fecha_nacimiento" DATE,
    "direccion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_persona" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleado" (
    "id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "cargo" VARCHAR(100),
    "area" VARCHAR(100),
    "fecha_ingreso" DATE,
    "fecha_des_lab" DATE,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_empleado" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "tipo_cliente" "tipo_cliente_enum",
    "razon_social" VARCHAR(200),
    "categoria_cliente" "categoria_cliente_enum" NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_cliente" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "contraseña" VARCHAR(255) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "token_recuperacion" VARCHAR(255),
    "token_expiracion" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_user" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(255),
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_rol" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ruta" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_ruta" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceso" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "ruta_id" INTEGER NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_acceso" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_usuario_rol" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "referencia_id" UUID,
    "referencia_tipo" "referencia_tipo_enum",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_notificacion" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion_user" (
    "notificacion_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fecha_leido" TIMESTAMPTZ(6),
    "sns_message_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_notificacion_user" PRIMARY KEY ("notificacion_id","user_id")
);

-- CreateTable
CREATE TABLE "empresa" (
    "id" SERIAL NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "ruc" CHAR(11) NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" VARCHAR(9),
    "email" VARCHAR(100),
    "logo_url" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_empresa" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_persona_numero_documento" ON "persona"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "uq_empleado_persona_id" ON "empleado"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_cliente_persona_id" ON "cliente"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_persona_id" ON "user"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_email" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_username" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rol_nombre" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ruta_nombre" ON "ruta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "uq_acceso_rol_ruta" ON "acceso"("rol_id", "ruta_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_usuario_rol" ON "usuario_rol"("user_id", "rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_empresa_ruc" ON "empresa"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "uq_empresa_email" ON "empresa"("email");

-- AddForeignKey
ALTER TABLE "empleado" ADD CONSTRAINT "fk_empleado_persona" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "fk_cliente_persona" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "fk_user_persona" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ruta" ADD CONSTRAINT "fk_ruta_parent" FOREIGN KEY ("parent_id") REFERENCES "ruta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "acceso" ADD CONSTRAINT "fk_acceso_rol" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "acceso" ADD CONSTRAINT "fk_acceso_ruta" FOREIGN KEY ("ruta_id") REFERENCES "ruta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "fk_usuario_rol_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "fk_usuario_rol_rol" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacion_user" ADD CONSTRAINT "fk_notificacion_user_notif" FOREIGN KEY ("notificacion_id") REFERENCES "notificacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacion_user" ADD CONSTRAINT "fk_notificacion_user_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
