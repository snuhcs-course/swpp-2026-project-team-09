-- CreateEnum
CREATE TYPE "judgement_outcome" AS ENUM ('judged', 'no_event', 'failed');

-- AlterTable
ALTER TABLE "source_posts" ADD COLUMN     "step_failed_at" TIMESTAMP(3),
ADD COLUMN     "step_failure" TEXT;

-- CreateTable
CREATE TABLE "judgements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_post_id" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimed_at" TIMESTAMP(3),
    "outcome" "judgement_outcome",
    "failure" TEXT,
    "announces_event" BOOLEAN,
    "sessions" JSONB,
    "model_id" TEXT,
    "judged_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),

    CONSTRAINT "judgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "judgements_source_post_id_key" ON "judgements"("source_post_id");

-- AddForeignKey
ALTER TABLE "judgements" ADD CONSTRAINT "judgements_source_post_id_fkey" FOREIGN KEY ("source_post_id") REFERENCES "source_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
