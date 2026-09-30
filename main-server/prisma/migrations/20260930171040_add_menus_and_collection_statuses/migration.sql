-- CreateEnum
CREATE TYPE "meal" AS ENUM ('breakfast', 'lunch', 'dinner');

-- CreateEnum
CREATE TYPE "collection_source" AS ENUM ('coop_menus', 'dormitory_menus', 'veterinary_menus');

-- CreateTable
CREATE TABLE "restaurant_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "collection_source" NOT NULL,
    "restaurant" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "operating_hours" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_day_id" UUID NOT NULL,
    "meal" "meal" NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER,
    "position" INTEGER NOT NULL,

    CONSTRAINT "menu_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "collection_source" NOT NULL,
    "last_succeeded_at" TIMESTAMP(3),
    "last_failed_at" TIMESTAMP(3),
    "last_failure_reason" TEXT,

    CONSTRAINT "collection_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_days_date_source_restaurant_key" ON "restaurant_days"("date", "source", "restaurant");

-- CreateIndex
CREATE INDEX "menu_entries_restaurant_day_id_idx" ON "menu_entries"("restaurant_day_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_statuses_source_key" ON "collection_statuses"("source");

-- AddForeignKey
ALTER TABLE "menu_entries" ADD CONSTRAINT "menu_entries_restaurant_day_id_fkey" FOREIGN KEY ("restaurant_day_id") REFERENCES "restaurant_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
