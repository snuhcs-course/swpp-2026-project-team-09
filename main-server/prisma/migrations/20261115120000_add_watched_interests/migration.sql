-- AlterTable
ALTER TABLE "global_events" ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topics_read_at" TIMESTAMPTZ,
ADD COLUMN     "topics_tries" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "quests" ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topics_read_at" TIMESTAMPTZ,
ADD COLUMN     "topics_tries" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "watched_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "words" TEXT NOT NULL,
    "topics" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watched_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watched_interests_user_id_idx" ON "watched_interests"("user_id");

-- AddForeignKey
ALTER TABLE "watched_interests" ADD CONSTRAINT "watched_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
