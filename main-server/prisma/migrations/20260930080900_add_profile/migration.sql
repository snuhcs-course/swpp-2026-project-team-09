-- AlterTable
ALTER TABLE "users" ADD COLUMN     "admission_year" INTEGER,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "name" TEXT;
