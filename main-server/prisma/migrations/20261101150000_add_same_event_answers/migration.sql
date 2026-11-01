-- AlterEnum
ALTER TYPE "session_hold" ADD VALUE 'ai_unsure';
ALTER TYPE "session_hold" ADD VALUE 'ai_failed';
ALTER TYPE "session_hold" ADD VALUE 'candidates_changed';

-- CreateEnum
CREATE TYPE "same_event_outcome" AS ENUM ('chosen', 'none', 'unsure', 'several', 'failed');

-- CreateTable
CREATE TABLE "same_event_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_post_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "outcome" "same_event_outcome",
    "asked_event_ids" UUID[],
    "chosen_event_id" UUID,
    "reason" TEXT,
    "failure" TEXT,
    "model_id" TEXT,
    "claimed_at" TIMESTAMP(3) NOT NULL,
    "answered_at" TIMESTAMP(3),

    CONSTRAINT "same_event_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "same_event_answers_source_post_id_starts_at_key" ON "same_event_answers"("source_post_id", "starts_at");

-- AddForeignKey
ALTER TABLE "same_event_answers" ADD CONSTRAINT "same_event_answers_source_post_id_fkey" FOREIGN KEY ("source_post_id") REFERENCES "source_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
