-- CreateEnum
CREATE TYPE "cuisine" AS ENUM ('korean', 'chinese', 'japanese', 'western', 'snack', 'other');

-- CreateTable
CREATE TABLE "dish_cuisines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "cuisine" "cuisine",

    CONSTRAINT "dish_cuisines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dish_cuisines_name_key" ON "dish_cuisines"("name");

