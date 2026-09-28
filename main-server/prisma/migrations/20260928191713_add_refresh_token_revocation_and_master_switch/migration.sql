-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "family_id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "revoked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "master_switch" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
