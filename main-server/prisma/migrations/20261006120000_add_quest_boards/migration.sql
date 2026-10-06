-- CreateEnum
CREATE TYPE "quest_board" AS ENUM ('meal', 'career', 'hobby', 'show');

-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "board" "quest_board",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '';

-- Every stored Open or Approval Quest is posted on the most general board.
UPDATE "quests" SET "board" = 'hobby' WHERE "join_policy" <> 'closed';

-- An Open or an Approval Quest is on a board, and a Closed one on none.
ALTER TABLE "quests" ADD CONSTRAINT "quests_board_check" CHECK (("board" IS NULL) = ("join_policy" = 'closed')),
ADD CONSTRAINT "quests_description_check" CHECK (char_length("description") <= 200);
