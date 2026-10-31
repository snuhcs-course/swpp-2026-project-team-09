-- CreateEnum
CREATE TYPE "session_hold" AS ENUM ('link_not_one_to_one', 'several_matches');

-- AlterTable
ALTER TABLE "source_posts" ADD COLUMN "links" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "source_post_sessions" ADD COLUMN "held_for" "session_hold",
ADD COLUMN "own_draft" JSONB,
ADD COLUMN "time_read_from_body" BOOLEAN NOT NULL DEFAULT false;
