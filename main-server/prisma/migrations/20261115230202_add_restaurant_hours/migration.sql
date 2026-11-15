-- CreateEnum
CREATE TYPE "day_kind" AS ENUM ('weekday', 'saturday', 'sunday');

-- CreateTable
CREATE TABLE "restaurant_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "source" NOT NULL,
    "restaurant" TEXT NOT NULL,
    "meal" "meal" NOT NULL,
    "day_kind" "day_kind" NOT NULL,
    "opens_at" TEXT NOT NULL,
    "closes_at" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_hours_source_restaurant_meal_day_kind_key" ON "restaurant_hours"("source", "restaurant", "meal", "day_kind");

