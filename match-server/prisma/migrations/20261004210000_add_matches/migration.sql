-- CreateEnum
CREATE TYPE "match_state" AS ENUM ('awaiting_quest', 'quest_created', 'closed');

-- AlterTable
ALTER TABLE "matching_requests" ADD COLUMN     "match_id" UUID;

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "global_event_id" UUID NOT NULL,
    "state" "match_state" NOT NULL DEFAULT 'awaiting_quest',
    "quest_id" UUID,
    "formed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id"),
    -- The main server's Quest is stored once it has answered, and only then.
    CONSTRAINT "matches_quest_id_check" CHECK (("state" = 'quest_created') = ("quest_id" IS NOT NULL))
);

-- CreateIndex
CREATE INDEX "matches_state_idx" ON "matches"("state");

-- CreateIndex
CREATE INDEX "matching_requests_match_id_idx" ON "matching_requests"("match_id");

-- AddForeignKey
ALTER TABLE "matching_requests" ADD CONSTRAINT "matching_requests_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
