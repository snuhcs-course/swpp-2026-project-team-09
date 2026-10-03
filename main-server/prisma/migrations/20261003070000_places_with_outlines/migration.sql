-- AlterEnum
ALTER TYPE "building_origin" RENAME TO "place_origin";
ALTER TYPE "place_origin" ADD VALUE 'national_map';

-- RenameTable
ALTER TABLE "buildings" RENAME TO "places";
ALTER TABLE "places" RENAME CONSTRAINT "buildings_pkey" TO "places_pkey";
ALTER INDEX "buildings_origin_origin_id_key" RENAME TO "places_origin_origin_id_key";

-- AlterTable
ALTER TABLE "places" DROP COLUMN "outline",
ADD COLUMN     "outlines" JSONB NOT NULL DEFAULT '[]';
