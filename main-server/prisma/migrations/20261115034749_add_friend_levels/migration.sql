-- CreateEnum
CREATE TYPE "friend_level" AS ENUM ('timetable', 'building', 'exact');

-- AlterTable
ALTER TABLE "friendships" ADD COLUMN     "user_a_level" "friend_level" NOT NULL DEFAULT 'building',
ADD COLUMN     "user_b_level" "friend_level" NOT NULL DEFAULT 'building';

-- A switch that was on lets the Friend see the position, and one that was off only the Timetable, so that nobody sees
-- more or less than before. A Friend Request that waits becomes a new friendship, which starts at the building.
UPDATE "friendships"
SET "user_a_level" = CASE WHEN "user_a_sharing" THEN 'exact'::"friend_level" ELSE 'timetable'::"friend_level" END,
    "user_b_level" = CASE WHEN "user_b_sharing" THEN 'exact'::"friend_level" ELSE 'timetable'::"friend_level" END
WHERE "accepted_at" IS NOT NULL;

-- AlterTable
ALTER TABLE "friendships" DROP COLUMN "user_a_sharing",
DROP COLUMN "user_b_sharing";
