-- CreateTable
CREATE TABLE "persons"."solicitud_cambio_email" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email_nuevo" VARCHAR(150) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expira_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_solicitud_cambio_email" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_solicitud_cambio_email_user_id" ON "persons"."solicitud_cambio_email"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_solicitud_cambio_email_token_hash" ON "persons"."solicitud_cambio_email"("token_hash");

-- AddForeignKey
ALTER TABLE "persons"."solicitud_cambio_email" ADD CONSTRAINT "fk_solicitud_cambio_email_user" FOREIGN KEY ("user_id") REFERENCES "persons"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
