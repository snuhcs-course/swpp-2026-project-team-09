-- The meal of a Quest made from a meal's Plan, which a new Plan for the same meal and day sets aside and replaces.
-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "meal" "meal";

-- The meal Quests made before the column carry their Plan's title, "<Restaurant>에서 점심" or "<Restaurant>에서 저녁".
UPDATE "quests" SET "meal" = 'lunch' WHERE "global_event_id" IS NULL AND "title" LIKE '%에서 점심';
UPDATE "quests" SET "meal" = 'dinner' WHERE "global_event_id" IS NULL AND "title" LIKE '%에서 저녁';
