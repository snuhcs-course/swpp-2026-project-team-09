-- AlterTable
ALTER TABLE "users" ADD COLUMN     "admission_year" INTEGER,
ADD COLUMN     "department" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "google_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "onboarded_at" TIMESTAMP(3);
