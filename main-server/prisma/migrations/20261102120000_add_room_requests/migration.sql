-- CreateEnum
CREATE TYPE "room_request_status" AS ENUM ('gathering', 'ready', 'booked', 'cancelled', 'dissolved', 'expired');

-- CreateTable
CREATE TABLE "room_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quest_id" UUID NOT NULL,
    "made_for_booking" BOOLEAN NOT NULL,
    "requester_id" UUID NOT NULL,
    "space_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "use_desc" TEXT,
    "status" "room_request_status" NOT NULL DEFAULT 'gathering',
    "failed_user_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_consents" (
    "request_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answered_at" TIMESTAMP(3),
    "consented" BOOLEAN,

    CONSTRAINT "room_consents_pkey" PRIMARY KEY ("request_id","user_id")
);

-- CreateTable
CREATE TABLE "room_notices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_requests_quest_id_idx" ON "room_requests"("quest_id");

-- CreateIndex
CREATE INDEX "room_requests_requester_id_idx" ON "room_requests"("requester_id");

-- CreateIndex
CREATE INDEX "room_requests_status_starts_at_idx" ON "room_requests"("status", "starts_at");

-- CreateIndex
CREATE INDEX "room_consents_user_id_idx" ON "room_consents"("user_id");

-- CreateIndex
CREATE INDEX "room_notices_user_id_idx" ON "room_notices"("user_id");

-- AddForeignKey
ALTER TABLE "room_requests" ADD CONSTRAINT "room_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_consents" ADD CONSTRAINT "room_consents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "room_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_consents" ADD CONSTRAINT "room_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_notices" ADD CONSTRAINT "room_notices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_notices" ADD CONSTRAINT "room_notices_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "room_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

