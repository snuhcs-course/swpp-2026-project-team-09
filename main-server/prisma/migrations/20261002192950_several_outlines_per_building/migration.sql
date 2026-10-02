/*
  Warnings:

  - You are about to drop the column `outline` on the `buildings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "buildings" DROP COLUMN "outline",
ADD COLUMN     "outlines" JSONB NOT NULL DEFAULT '[]';
