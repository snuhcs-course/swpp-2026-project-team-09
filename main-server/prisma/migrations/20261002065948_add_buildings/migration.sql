-- CreateEnum
CREATE TYPE "building_source" AS ENUM ('campus_map', 'openstreetmap');

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "building_source" NOT NULL,
    "source_id" TEXT NOT NULL,
    "number" TEXT,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buildings_source_source_id_key" ON "buildings"("source", "source_id");
