-- CreateEnum
CREATE TYPE "menu_line_kind" AS ENUM ('heading', 'dish', 'note');

-- CreateEnum
CREATE TYPE "meal" AS ENUM ('breakfast', 'lunch', 'dinner');

-- CreateEnum
CREATE TYPE "source" AS ENUM ('coop_menus', 'dormitory_menus', 'veterinary_menus');

-- CreateTable
CREATE TABLE "restaurant_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "source" NOT NULL,
    "date" DATE NOT NULL,
    "restaurant" TEXT NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_day_id" UUID NOT NULL,
    "meal" "meal" NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "kind" "menu_line_kind",
    "name" TEXT,
    "price" INTEGER,

    CONSTRAINT "menu_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "source" NOT NULL,
    "last_succeeded_at" TIMESTAMP(3),
    "last_failed_at" TIMESTAMP(3),
    "last_failure_reason" TEXT,

    CONSTRAINT "collection_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_days_date_source_restaurant_key" ON "restaurant_days"("date", "source", "restaurant");

-- CreateIndex
CREATE UNIQUE INDEX "menu_lines_restaurant_day_id_position_key" ON "menu_lines"("restaurant_day_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "collection_statuses_source_key" ON "collection_statuses"("source");

-- AddForeignKey
ALTER TABLE "menu_lines" ADD CONSTRAINT "menu_lines_restaurant_day_id_fkey" FOREIGN KEY ("restaurant_day_id") REFERENCES "restaurant_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
