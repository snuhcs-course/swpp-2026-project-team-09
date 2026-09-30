-- Users from before profiles have no name or department, so they are removed and sign up again.
DELETE FROM "refresh_tokens";
DELETE FROM "sessions";
DELETE FROM "users";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "admission_year" INTEGER,
ADD COLUMN     "department" TEXT NOT NULL,
ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "name" TEXT NOT NULL;
