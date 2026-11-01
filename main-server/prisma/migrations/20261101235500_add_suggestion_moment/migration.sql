-- CreateEnum
CREATE TYPE "suggestion_moment" AS ENUM ('open', 'answer');

-- AlterTable
ALTER TABLE "suggestion_impressions" ADD COLUMN "moment" "suggestion_moment" NOT NULL DEFAULT 'open';
