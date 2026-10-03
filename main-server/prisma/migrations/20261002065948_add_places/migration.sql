-- CreateEnum
CREATE TYPE "place_origin" AS ENUM ('campus_map', 'openstreetmap', 'national_map');

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "origin" "place_origin" NOT NULL,
    "origin_id" TEXT NOT NULL,
    "number" TEXT,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "outlines" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "places_origin_origin_id_key" ON "places"("origin", "origin_id");
