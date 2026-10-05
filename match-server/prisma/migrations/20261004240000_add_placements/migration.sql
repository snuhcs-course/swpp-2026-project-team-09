-- AlterTable
ALTER TABLE "matching_requests" ADD COLUMN     "quest_id" UUID,
-- A request a round placed into an Open Quest names it, and it is in no match.
ADD CONSTRAINT "matching_requests_quest_id_check" CHECK ("quest_id" IS NULL OR ("state" = 'matched' AND "match_id" IS NULL));
