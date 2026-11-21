-- A Quest made from a meeting's Plan, which the Assistant names as a meeting.
-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "meet" BOOLEAN NOT NULL DEFAULT false;

-- The meeting Quests made before the column carry their Plan's title, "<Place>에서 만나기".
UPDATE "quests" SET "meet" = true WHERE "global_event_id" IS NULL AND "title" LIKE '%에서 만나기';
