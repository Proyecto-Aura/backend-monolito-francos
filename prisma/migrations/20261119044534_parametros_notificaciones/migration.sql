-- CreateEnum
CREATE TYPE "persons"."canal_notificacion_tipo_enum" AS ENUM ('email', 'portal');

-- CreateEnum
CREATE TYPE "persons"."plantilla_notificacion_clave_enum" AS ENUM ('verificacion_email', 'bienvenida_cliente', 'credenciales_usuario_interno', 'recuperar_contrasena', 'comprobante_emitido', 'pago_confirmado', 'pago_rechazado', 'pedido_en_camino', 'reembolso_aprobado', 'reembolso_rechazado', 'reembolso_procesado');

-- CreateEnum
CREATE TYPE "persons"."plantilla_notificacion_destinatario_enum" AS ENUM ('cliente', 'usuario_interno', 'ambos');

-- CreateTable
-- remitente/servidor_smtp/seguridad del canal email NO se guardan acá: esos
-- datos viven en las variables de entorno (SMTP_*) y se calculan en vivo al
-- responder el GET, para que nunca queden desactualizados respecto a la
-- configuración real (ver presenter).
CREATE TABLE "persons"."canal_notificacion" (
    "id" UUID NOT NULL,
    "tipo" "persons"."canal_notificacion_tipo_enum" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "destinatarios" VARCHAR(200),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_canal_notificacion" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons"."plantilla_notificacion" (
    "id" UUID NOT NULL,
    "clave" "persons"."plantilla_notificacion_clave_enum" NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "destinatario" "persons"."plantilla_notificacion_destinatario_enum" NOT NULL,
    "variables" JSONB NOT NULL,
    "asunto" VARCHAR(200) NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_plantilla_notificacion" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_canal_notificacion_tipo" ON "persons"."canal_notificacion"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "uq_plantilla_notificacion_clave" ON "persons"."plantilla_notificacion"("clave");

-- FNC-43: siembra de los 2 canales y las 11 plantillas. remitente/servidor_smtp/
-- seguridad del canal email quedan en null: son metadata informativa editable
-- por el admin, no reconfiguran el transporter real (ese sigue leyendo
-- SMTP_HOST/SMTP_FROM de las variables de entorno).
INSERT INTO "persons"."canal_notificacion" (id, tipo, activo, destinatarios) VALUES
  (gen_random_uuid(), 'email', true, NULL),
  (gen_random_uuid(), 'portal', true, 'Clientes del Portal B');

INSERT INTO "persons"."plantilla_notificacion" (id, clave, nombre, destinatario, variables, asunto, cuerpo) VALUES
  (gen_random_uuid(), 'verificacion_email', 'Verificación de email', 'cliente',
   '["nombre", "enlace"]',
   'Verifica tu correo — Franco''s',
   '<p>Hola {{nombre}}, confirma tu correo haciendo clic aquí: <a href="{{enlace}}">{{enlace}}</a></p>'),

  (gen_random_uuid(), 'bienvenida_cliente', 'Bienvenida de cliente', 'cliente',
   '["nombre", "username", "contrasena_temporal", "enlace"]',
   'Bienvenido a Franco''s — verifica tu correo',
   '<p>Hola {{nombre}}, tu usuario es <b>{{username}}</b> y tu contraseña temporal es <b>{{contrasena_temporal}}</b>. Deberás cambiarla al iniciar sesión.</p><p>Verifica tu correo aquí: <a href="{{enlace}}">{{enlace}}</a></p><p>El enlace vence en 24 horas.</p><p>Si no solicitaste esta cuenta, puedes ignorar este correo.</p>'),

  (gen_random_uuid(), 'credenciales_usuario_interno', 'Credenciales de usuario interno', 'usuario_interno',
   '["nombre", "username", "contrasena_temporal"]',
   'Tus credenciales de acceso — Franco''s',
   '<p>Hola {{nombre}}, tu usuario es <b>{{username}}</b> y tu contraseña temporal es <b>{{contrasena_temporal}}</b>. Deberás cambiarla al iniciar sesión.</p>'),

  (gen_random_uuid(), 'recuperar_contrasena', 'Recuperar contraseña', 'ambos',
   '["nombre", "enlace", "vigencia"]',
   'Restablece tu contraseña — Franco''s',
   '<p>Hola {{nombre}}, recibimos una solicitud para restablecer tu contraseña.</p><p>Usa este enlace: <a href="{{enlace}}">{{enlace}}</a></p><p>El enlace vence en {{vigencia}}.</p><p>Si no solicitaste este cambio, puedes ignorar este correo.</p>'),

  (gen_random_uuid(), 'comprobante_emitido', 'Comprobante emitido', 'cliente',
   '["cliente", "serie_numero", "total", "codigo"]',
   'Tu comprobante {{serie_numero}} — Franco''s',
   '<p>Hola {{cliente}}, gracias por tu compra. Adjuntamos el comprobante {{serie_numero}} de tu pedido {{codigo}} por un total de {{total}}.</p>'),

  (gen_random_uuid(), 'pago_confirmado', 'Pago confirmado', 'cliente',
   '["cliente", "codigo", "total", "metodo_pago"]',
   'Confirmamos el pago de tu pedido {{codigo}} — Franco''s',
   '<p>Hola {{cliente}}, confirmamos que recibimos tu pago del pedido {{codigo}} por un total de {{total}}, mediante {{metodo_pago}}.</p><p>Gracias por tu compra.</p>'),

  (gen_random_uuid(), 'pago_rechazado', 'Pago rechazado', 'cliente',
   '["cliente", "codigo", "motivo"]',
   'No pudimos procesar el pago de tu pedido {{codigo}} — Franco''s',
   '<p>Hola {{cliente}}, no pudimos procesar el pago de tu pedido {{codigo}}. Motivo: {{motivo}}.</p><p>Puedes intentarlo nuevamente desde tu cuenta.</p>'),

  (gen_random_uuid(), 'pedido_en_camino', 'Pedido en camino', 'cliente',
   '["cliente", "codigo", "fecha_entrega"]',
   'Tu pedido {{codigo}} está en camino — Franco''s',
   '<p>Hola {{cliente}}, tu pedido {{codigo}} ya salió y llegará aproximadamente el {{fecha_entrega}}.</p>'),

  (gen_random_uuid(), 'reembolso_aprobado', 'Reembolso aprobado', 'cliente',
   '["cliente", "codigo", "monto"]',
   'Tu reembolso del pedido {{codigo}} fue aprobado — Franco''s',
   '<p>Hola {{cliente}}, aprobamos tu solicitud de reembolso del pedido {{codigo}} por {{monto}}. Te avisaremos cuando se procese.</p>'),

  (gen_random_uuid(), 'reembolso_rechazado', 'Reembolso rechazado', 'cliente',
   '["cliente", "codigo", "motivo"]',
   'Tu reembolso del pedido {{codigo}} fue rechazado — Franco''s',
   '<p>Hola {{cliente}}, no pudimos aprobar tu solicitud de reembolso del pedido {{codigo}}. Motivo: {{motivo}}.</p>'),

  (gen_random_uuid(), 'reembolso_procesado', 'Reembolso procesado', 'cliente',
   '["cliente", "codigo", "monto", "metodo_pago"]',
   'Procesamos el reembolso de tu pedido {{codigo}} — Franco''s',
   '<p>Hola {{cliente}}, procesamos el reembolso de tu pedido {{codigo}} por {{monto}} mediante {{metodo_pago}}.</p>');
