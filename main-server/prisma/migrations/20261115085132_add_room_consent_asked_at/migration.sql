-- AlterTable
ALTER TABLE "room_consents" ADD COLUMN     "asked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Every consent kept before this column was asked when its request was made.
UPDATE "room_consents" SET "asked_at" = "room_requests"."created_at"
FROM "room_requests"
WHERE "room_requests"."id" = "room_consents"."request_id";
