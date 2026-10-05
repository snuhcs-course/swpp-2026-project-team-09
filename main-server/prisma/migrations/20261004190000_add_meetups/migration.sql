-- CreateEnum
CREATE TYPE "meetup_state" AS ENUM ('proposed', 'accepted', 'declined', 'withdrawn');

-- CreateTable
CREATE TABLE "meetups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposer_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "place_id" UUID,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "place_label" TEXT,
    "state" "meetup_state" NOT NULL DEFAULT 'proposed',
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meetups_users_check" CHECK ("proposer_id" <> "receiver_id"),
    CONSTRAINT "meetups_time_check" CHECK ("ends_at" > "starts_at"),
    -- A Place, or a point with its label.
    CONSTRAINT "meetups_place_check" CHECK (
        ("latitude" IS NULL) = ("longitude" IS NULL)
        AND ("latitude" IS NULL) = ("place_label" IS NULL)
        AND ("place_id" IS NULL) <> ("latitude" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "meetups_proposer_id_idx" ON "meetups"("proposer_id");

-- CreateIndex
CREATE INDEX "meetups_receiver_id_idx" ON "meetups"("receiver_id");

-- AddForeignKey
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

