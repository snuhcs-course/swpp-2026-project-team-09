-- CreateEnum
CREATE TYPE "session_end_reason" AS ENUM ('replaced', 'signed_out', 'refresh_token_reused');

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- Refresh tokens from before sessions belong to none, so their Users sign in again.
DELETE FROM "refresh_tokens";

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "user_id",
ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "session_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "end_reason" "session_end_reason",

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_id_key" ON "sessions"("user_id") WHERE ("ended_at" IS NULL);

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
