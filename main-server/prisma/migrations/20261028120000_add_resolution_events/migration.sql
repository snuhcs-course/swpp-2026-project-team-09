-- CreateEnum
CREATE TYPE "resolver_kind" AS ENUM ('place', 'friend', 'global_event');

-- CreateEnum
CREATE TYPE "resolution_result" AS ENUM ('none', 'one', 'several');

-- CreateEnum
CREATE TYPE "resolution_tier" AS ENUM ('exact', 'alias', 'generated', 'subsequence', 'distance');

-- CreateEnum
CREATE TYPE "resolution_alias_source" AS ENUM ('personal', 'global', 'curated');

-- CreateEnum
CREATE TYPE "resolution_outcome" AS ENUM ('answered', 'chosen', 'edited', 'rejected');

-- CreateTable
CREATE TABLE "resolution_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" "resolver_kind" NOT NULL,
    "words" TEXT NOT NULL,
    "choseong" TEXT,
    "result" "resolution_result",
    "tier" "resolution_tier",
    "alias_source" "resolution_alias_source",
    "candidate_ids" UUID[],
    "chosen_id" UUID,
    "outcome" "resolution_outcome" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolution_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "resolution_events_words_check" CHECK (char_length("words") <= 50),
    CONSTRAINT "resolution_events_candidate_ids_check" CHECK (cardinality("candidate_ids") <= 10)
);

-- CreateIndex
CREATE INDEX "resolution_events_user_id_created_at_idx" ON "resolution_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "resolution_events_kind_words_created_at_idx" ON "resolution_events"("kind", "words", "created_at");

-- AddForeignKey
ALTER TABLE "resolution_events" ADD CONSTRAINT "resolution_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
