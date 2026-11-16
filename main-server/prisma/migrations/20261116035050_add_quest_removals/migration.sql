-- CreateTable
CREATE TABLE "quest_removals" (
    "quest_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_removals_pkey" PRIMARY KEY ("quest_id","user_id")
);

-- CreateIndex
CREATE INDEX "quest_removals_user_id_idx" ON "quest_removals"("user_id");

-- AddForeignKey
ALTER TABLE "quest_removals" ADD CONSTRAINT "quest_removals_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_removals" ADD CONSTRAINT "quest_removals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
