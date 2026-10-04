-- CreateEnum
CREATE TYPE "global_event_state" AS ENUM ('draft', 'published', 'cancelled', 'discarded');

-- AlterEnum
ALTER TYPE "source" ADD VALUE 'snu_events';

-- CreateTable
CREATE TABLE "global_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "place" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "state" "global_event_state" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "post_number" INTEGER,
    "source_url" TEXT,

    CONSTRAINT "global_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_events_post_number_key" ON "global_events"("post_number");
