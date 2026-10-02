-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "source" ADD VALUE 'shuttle_stops';
ALTER TYPE "source" ADD VALUE 'shuttle_vehicles';

-- CreateTable
CREATE TABLE "shuttle_routes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" TEXT NOT NULL,
    "line" JSONB NOT NULL,
    "service_hours" TEXT,

    CONSTRAINT "shuttle_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shuttle_stops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seed_key" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "loop_order" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "drawing_left" INTEGER NOT NULL,
    "drawing_top" INTEGER NOT NULL,

    CONSTRAINT "shuttle_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shuttle_vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "car_id" TEXT NOT NULL,
    "stop_id" UUID NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shuttle_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shuttle_routes_number_key" ON "shuttle_routes"("number");

-- CreateIndex
CREATE UNIQUE INDEX "shuttle_stops_seed_key_key" ON "shuttle_stops"("seed_key");

-- CreateIndex
CREATE UNIQUE INDEX "shuttle_vehicles_car_id_key" ON "shuttle_vehicles"("car_id");

-- AddForeignKey
ALTER TABLE "shuttle_vehicles" ADD CONSTRAINT "shuttle_vehicles_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "shuttle_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
