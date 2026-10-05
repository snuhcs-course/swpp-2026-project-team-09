-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "match_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "quests_match_id_key" ON "quests"("match_id");
