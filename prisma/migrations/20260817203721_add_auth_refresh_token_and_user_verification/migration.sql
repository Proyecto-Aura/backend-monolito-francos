-- AlterTable
ALTER TABLE "user" ADD COLUMN     "debe_cambiar_contrasena" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "token_verificacion_email" VARCHAR(255),
ADD COLUMN     "token_verificacion_email_expiracion" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_refresh_token" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_refresh_token_hash" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user" ON "refresh_token"("user_id");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "fk_refresh_token_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
