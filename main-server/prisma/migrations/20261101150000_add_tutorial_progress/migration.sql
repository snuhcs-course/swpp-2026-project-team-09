-- CreateEnum
CREATE TYPE "tutorial_completion" AS ENUM ('button', 'checked', 'forced', 'skipped');

-- CreateTable
CREATE TABLE "tutorial_progress" (
    "user_id" UUID NOT NULL,
    "enabled_at" TIMESTAMP(3),
    "stopped_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "row_hidden_at" TIMESTAMP(3),

    CONSTRAINT "tutorial_progress_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "tutorial_quest_progress" (
    "user_id" UUID NOT NULL,
    "quest_key" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed_by" "tutorial_completion",

    CONSTRAINT "tutorial_quest_progress_pkey" PRIMARY KEY ("user_id","quest_key")
);

-- AddForeignKey
ALTER TABLE "tutorial_progress" ADD CONSTRAINT "tutorial_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_quest_progress" ADD CONSTRAINT "tutorial_quest_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
