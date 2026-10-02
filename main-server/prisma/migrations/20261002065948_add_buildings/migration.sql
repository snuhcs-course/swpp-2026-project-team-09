-- CreateEnum
CREATE TYPE "building_origin" AS ENUM ('campus_map', 'openstreetmap');

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "origin" "building_origin" NOT NULL,
    "origin_id" TEXT NOT NULL,
    "number" TEXT,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "outline" JSONB,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buildings_origin_origin_id_key" ON "buildings"("origin", "origin_id");
