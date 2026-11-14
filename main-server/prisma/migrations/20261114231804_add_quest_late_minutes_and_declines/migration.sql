-- AlterTable
ALTER TABLE "quest_holders" ADD COLUMN     "late_minutes" INTEGER;

-- A Holder is late by 1 to 120 minutes, or not late.
ALTER TABLE "quest_holders" ADD CONSTRAINT "quest_holders_late_minutes_check" CHECK ("late_minutes" BETWEEN 1 AND 120);

-- CreateTable
CREATE TABLE "quest_declines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quest_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "declined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_declines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quest_declines_user_id_idx" ON "quest_declines"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_declines_quest_id_user_id_key" ON "quest_declines"("quest_id", "user_id");

-- AddForeignKey
ALTER TABLE "quest_declines" ADD CONSTRAINT "quest_declines_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_declines" ADD CONSTRAINT "quest_declines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
