-- Matching was removed with the match server, and nothing reads or writes the match a Quest was created for. This
-- cannot be undone: the ids are lost. The Quests themselves stay.

-- DropIndex
DROP INDEX "quests_match_id_key";

-- AlterTable
ALTER TABLE "quests" DROP COLUMN "match_id";
