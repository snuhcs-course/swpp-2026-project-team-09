-- CreateEnum
CREATE TYPE "matching_request_state" AS ENUM ('waiting', 'matched', 'withdrawn', 'expired');

-- CreateTable
CREATE TABLE "matching_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "global_event_id" UUID NOT NULL,
    "size" INTEGER NOT NULL,
    "hashtags" TEXT[],
    "state" "matching_request_state" NOT NULL DEFAULT 'waiting',
    "arrived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matching_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "matching_requests_size_check" CHECK ("size" BETWEEN 2 AND 4)
);

-- CreateIndex
CREATE INDEX "matching_requests_user_id_global_event_id_idx" ON "matching_requests"("user_id", "global_event_id");

-- CreateIndex
-- One open request per User and Global Event: a User asks again once the earlier request is no longer waiting.
CREATE UNIQUE INDEX "matching_requests_user_id_global_event_id_key" ON "matching_requests"("user_id", "global_event_id") WHERE ("state" = 'waiting');
